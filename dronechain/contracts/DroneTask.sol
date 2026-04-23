// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title  DroneTask
 * @notice Decentralised marketplace for autonomous drone task assignments.
 *         Task creators escrow a reward; operators submit on-chain proofs;
 *         the creator (or a verified AI oracle in a future version) approves/rejects.
 * @dev    Deployed on Monad Testnet.  All monetary values are in wei (native MON).
 *
 * Lifecycle:
 *   createTask  → OPEN
 *   acceptTask  → ACCEPTED
 *   submitProof → SUBMITTED
 *   approveTask → APPROVED  (reward released)
 *   rejectTask  → OPEN      (task reopens for new applicants)
 */
contract DroneTask {

    // ── Enums ────────────────────────────────────────────────────────────────

    enum TaskStatus {
        OPEN,        // 0
        ACCEPTED,    // 1
        IN_PROGRESS, // 2
        SUBMITTED,   // 3
        APPROVED,    // 4
        REJECTED,    // 5
        EXPIRED      // 6
    }

    // ── Structs ───────────────────────────────────────────────────────────────

    struct TaskRequirements {
        uint256 minCoverage;          // minimum area coverage (%)
        uint256 maxDurationMinutes;   // maximum allowed flight duration
        uint256 altitudeMin;          // lower altitude bound (metres)
        uint256 altitudeMax;          // upper altitude bound (metres)
    }

    struct DroneProofRecord {
        uint256 coveragePercent;
        uint256 durationMinutes;
        uint256 altitude;
        uint256 submittedAt;
        string  droneId;
    }

    struct Task {
        uint256      id;
        string       title;
        string       description;
        uint256      reward;           // escrowed amount in wei
        TaskStatus   status;
        address      creator;
        address      acceptedBy;
        uint256      deadline;         // Unix timestamp (seconds)
        TaskRequirements requirements;
        DroneProofRecord proof;        // populated after submitProof
    }

    // ── State ─────────────────────────────────────────────────────────────────

    uint256 public taskCount;

    /// @dev taskId → Task
    mapping(uint256 => Task) private _tasks;

    // ── Events ────────────────────────────────────────────────────────────────

    event TaskCreated(
        uint256 indexed taskId,
        address indexed creator,
        uint256         reward
    );

    event TaskAccepted(
        uint256 indexed taskId,
        address indexed operator
    );

    event ProofSubmitted(
        uint256 indexed taskId,
        address indexed operator,
        string          droneId
    );

    event TaskApproved(uint256 indexed taskId);
    event TaskRejected(uint256 indexed taskId);
    event TaskExpired (uint256 indexed taskId);

    // ── Errors ────────────────────────────────────────────────────────────────

    error NotCreator(uint256 taskId);
    error NotOperator(uint256 taskId);
    error InvalidStatus(uint256 taskId, TaskStatus current, TaskStatus expected);
    error TaskDeadlinePassed(uint256 taskId);
    error RewardTransferFailed(uint256 taskId, address recipient);
    error InvalidRequirements();
    error ZeroReward();

    // ── Modifiers ────────────────────────────────────────────────────────────

    modifier onlyCreator(uint256 taskId) {
        if (_tasks[taskId].creator != msg.sender) revert NotCreator(taskId);
        _;
    }

    modifier onlyOperator(uint256 taskId) {
        if (_tasks[taskId].acceptedBy != msg.sender) revert NotOperator(taskId);
        _;
    }

    modifier inStatus(uint256 taskId, TaskStatus expected) {
        TaskStatus current = _tasks[taskId].status;
        if (current != expected) revert InvalidStatus(taskId, current, expected);
        _;
    }

    modifier beforeDeadline(uint256 taskId) {
        if (block.timestamp >= _tasks[taskId].deadline)
            revert TaskDeadlinePassed(taskId);
        _;
    }

    // ── Task Creation ────────────────────────────────────────────────────────

    /**
     * @notice Create a new drone task and escrow the reward.
     * @param title               Human-readable task title.
     * @param description         Detailed task description.
     * @param minCoverage         Required area coverage in percent (1–100).
     * @param maxDurationMinutes  Maximum allowed flight duration in minutes.
     * @param altitudeMin         Minimum allowed altitude in metres.
     * @param altitudeMax         Maximum allowed altitude in metres.
     * @param deadline            Unix timestamp after which the task expires.
     * @return taskId             The newly assigned task identifier.
     */
    function createTask(
        string calldata title,
        string calldata description,
        uint256 minCoverage,
        uint256 maxDurationMinutes,
        uint256 altitudeMin,
        uint256 altitudeMax,
        uint256 deadline
    ) external payable returns (uint256 taskId) {
        if (msg.value == 0) revert ZeroReward();
        if (
            minCoverage == 0 ||
            minCoverage > 100 ||
            maxDurationMinutes == 0 ||
            altitudeMin >= altitudeMax ||
            deadline <= block.timestamp
        ) revert InvalidRequirements();

        taskId = ++taskCount;

        _tasks[taskId] = Task({
            id:          taskId,
            title:       title,
            description: description,
            reward:      msg.value,
            status:      TaskStatus.OPEN,
            creator:     msg.sender,
            acceptedBy:  address(0),
            deadline:    deadline,
            requirements: TaskRequirements({
                minCoverage:         minCoverage,
                maxDurationMinutes:  maxDurationMinutes,
                altitudeMin:         altitudeMin,
                altitudeMax:         altitudeMax
            }),
            proof: DroneProofRecord({
                coveragePercent:  0,
                durationMinutes:  0,
                altitude:         0,
                submittedAt:      0,
                droneId:          ""
            })
        });

        emit TaskCreated(taskId, msg.sender, msg.value);
    }

    // ── Task Acceptance ───────────────────────────────────────────────────────

    /**
     * @notice Accept an open task as a drone operator.
     *         The caller cannot be the task creator.
     */
    function acceptTask(uint256 taskId)
        external
        inStatus(taskId, TaskStatus.OPEN)
        beforeDeadline(taskId)
    {
        Task storage t = _tasks[taskId];
        require(t.creator != msg.sender, "Creator cannot accept own task");

        t.acceptedBy = msg.sender;
        t.status     = TaskStatus.ACCEPTED;

        emit TaskAccepted(taskId, msg.sender);
    }

    // ── Proof Submission ──────────────────────────────────────────────────────

    /**
     * @notice Submit telemetry proof for an accepted task.
     * @param taskId          The task to submit proof for.
     * @param coveragePercent Actual area coverage achieved (%).
     * @param durationMinutes Actual flight duration.
     * @param altitude        Average flight altitude in metres.
     * @param droneId         Hardware serial of the drone.
     */
    function submitProof(
        uint256 taskId,
        uint256 coveragePercent,
        uint256 durationMinutes,
        uint256 altitude,
        string calldata droneId
    )
        external
        onlyOperator(taskId)
        beforeDeadline(taskId)
    {
        TaskStatus current = _tasks[taskId].status;
        require(
            current == TaskStatus.ACCEPTED || current == TaskStatus.REJECTED,
            "Task must be ACCEPTED or REJECTED (after re-open)"
        );

        Task storage t = _tasks[taskId];
        t.proof = DroneProofRecord({
            coveragePercent: coveragePercent,
            durationMinutes: durationMinutes,
            altitude:        altitude,
            submittedAt:     block.timestamp,
            droneId:         droneId
        });
        t.status = TaskStatus.SUBMITTED;

        emit ProofSubmitted(taskId, msg.sender, droneId);
    }

    // ── Approval / Rejection ──────────────────────────────────────────────────

    /**
     * @notice Approve the submitted proof and release the escrowed reward.
     *         Only callable by the task creator.
     */
    function approveTask(uint256 taskId)
        external
        onlyCreator(taskId)
        inStatus(taskId, TaskStatus.SUBMITTED)
    {
        Task storage t = _tasks[taskId];
        t.status = TaskStatus.APPROVED;

        address operator = t.acceptedBy;
        uint256 reward   = t.reward;
        t.reward = 0; // re-entrancy guard

        (bool ok, ) = operator.call{value: reward}("");
        if (!ok) revert RewardTransferFailed(taskId, operator);

        emit TaskApproved(taskId);
    }

    /**
     * @notice Reject the submitted proof.  Task re-opens for new submissions.
     *         Only callable by the task creator.
     */
    function rejectTask(uint256 taskId)
        external
        onlyCreator(taskId)
        inStatus(taskId, TaskStatus.SUBMITTED)
    {
        // Keep the operator assigned but allow them to re-submit
        _tasks[taskId].status = TaskStatus.REJECTED;
        emit TaskRejected(taskId);
    }

    // ── Expiry ────────────────────────────────────────────────────────────────

    /**
     * @notice Mark a task as expired and return the escrowed reward to the creator.
     *         Can be called by anyone once the deadline has passed and the task
     *         is not yet APPROVED.
     */
    function expireTask(uint256 taskId) external {
        Task storage t = _tasks[taskId];
        require(block.timestamp >= t.deadline, "Deadline not reached");
        require(
            t.status != TaskStatus.APPROVED && t.status != TaskStatus.EXPIRED,
            "Task already settled"
        );

        t.status = TaskStatus.EXPIRED;

        uint256 refund = t.reward;
        t.reward = 0;

        (bool ok, ) = t.creator.call{value: refund}("");
        if (!ok) revert RewardTransferFailed(taskId, t.creator);

        emit TaskExpired(taskId);
    }

    // ── View Functions ────────────────────────────────────────────────────────

    /// @notice Return a single task by id.
    function getTask(uint256 taskId) external view returns (Task memory) {
        return _tasks[taskId];
    }

    /// @notice Return all tasks (up to taskCount).
    function getAllTasks() external view returns (Task[] memory tasks) {
        tasks = new Task[](taskCount);
        for (uint256 i = 1; i <= taskCount; i++) {
            tasks[i - 1] = _tasks[i];
        }
    }

    /// @notice Return tasks created by a specific address.
    function getTasksByCreator(address creator)
        external
        view
        returns (Task[] memory)
    {
        uint256 count;
        for (uint256 i = 1; i <= taskCount; i++) {
            if (_tasks[i].creator == creator) count++;
        }
        Task[] memory result = new Task[](count);
        uint256 idx;
        for (uint256 i = 1; i <= taskCount; i++) {
            if (_tasks[i].creator == creator) result[idx++] = _tasks[i];
        }
        return result;
    }
}
