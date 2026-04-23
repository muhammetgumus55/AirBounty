// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract DroneTask {
    // -------------------------------------------------------------------------
    // Enums
    // -------------------------------------------------------------------------

    enum TaskStatus {
        OPEN,
        ACCEPTED,
        COMPLETED,
        VERIFIED,
        FAILED,
        CANCELLED
    }

    // -------------------------------------------------------------------------
    // Custom Errors
    // -------------------------------------------------------------------------

    error NotOwner();
    error ReentrantCall();
    error RewardRequired();
    error CreatorCannotAccept();
    error NotTaskCreator();
    error InvalidTaskStatus(TaskStatus current, TaskStatus required);
    error NotAssignedDrone();
    error TransferFailed();

    // -------------------------------------------------------------------------
    // Structs
    // -------------------------------------------------------------------------

    struct TaskRequirements {
        uint8 minCoverage;
        uint16 maxDurationMinutes;
        uint16 minAltitude;
        uint16 maxAltitude;
    }

    struct Task {
        uint256 id;
        address payable creator;
        address payable assignedDrone;
        uint256 reward;
        TaskStatus status;
        TaskRequirements requirements;
        string ipfsProofHash;
        uint256 createdAt;
        uint256 completedAt;
        string title;
        string description;
        string category;
        uint256 deadline;
    }

    // -------------------------------------------------------------------------
    // State variables
    // -------------------------------------------------------------------------

    mapping(uint256 => Task) public tasks;
    uint256 public taskCount;
    address public owner;
    bool private locked;

    // -------------------------------------------------------------------------
    // Events
    // -------------------------------------------------------------------------

    event TaskCreated(uint256 indexed taskId, address creator, uint256 reward, string title);
    event TaskAccepted(uint256 indexed taskId, address drone);
    event ProofSubmitted(uint256 indexed taskId, string proofHash);
    event TaskVerified(uint256 indexed taskId, bool approved, uint256 reward);
    event TaskCancelled(uint256 indexed taskId);

    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------

    constructor() {
        owner = msg.sender;
    }

    // -------------------------------------------------------------------------
    // Modifiers
    // -------------------------------------------------------------------------

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier noReentrant() {
        if (locked) revert ReentrantCall();
        locked = true;
        _;
        locked = false;
    }

    modifier taskExists(uint256 taskId) {
        require(taskId < taskCount, "Task does not exist");
        _;
    }

    // -------------------------------------------------------------------------
    // Functions
    // -------------------------------------------------------------------------

    function createTask(
        string calldata title,
        string calldata description,
        string calldata category,
        uint256 deadline,
        TaskRequirements calldata req
    ) external payable {
        require(bytes(title).length > 0, "Title required");
        require(deadline > block.timestamp, "Deadline must be in future");
        if (msg.value == 0) revert RewardRequired();

        uint256 taskId = taskCount;
        tasks[taskId] = Task({
            id: taskId,
            creator: payable(msg.sender),
            assignedDrone: payable(address(0)),
            reward: msg.value,
            status: TaskStatus.OPEN,
            requirements: req,
            ipfsProofHash: "",
            createdAt: block.timestamp,
            completedAt: 0,
            title: title,
            description: description,
            category: category,
            deadline: deadline
        });
        taskCount++;

        emit TaskCreated(taskId, msg.sender, msg.value, title);
    }

    function acceptTask(uint256 taskId) external taskExists(taskId) {
        Task storage task = tasks[taskId];
        if (task.status != TaskStatus.OPEN) revert InvalidTaskStatus(task.status, TaskStatus.OPEN);
        if (msg.sender == task.creator) revert CreatorCannotAccept();

        task.assignedDrone = payable(msg.sender);
        task.status = TaskStatus.ACCEPTED;

        emit TaskAccepted(taskId, msg.sender);
    }

    function submitProof(uint256 taskId, string calldata proofHash) external taskExists(taskId) {
        Task storage task = tasks[taskId];
        if (task.status != TaskStatus.ACCEPTED) revert InvalidTaskStatus(task.status, TaskStatus.ACCEPTED);
        if (msg.sender != task.assignedDrone) revert NotAssignedDrone();

        task.ipfsProofHash = proofHash;
        task.status = TaskStatus.COMPLETED;

        emit ProofSubmitted(taskId, proofHash);
    }

    function verifyAndPay(uint256 taskId, bool approved)
        external
        onlyOwner
        noReentrant
        taskExists(taskId)
    {
        Task storage task = tasks[taskId];
        if (task.status != TaskStatus.COMPLETED) revert InvalidTaskStatus(task.status, TaskStatus.COMPLETED);

        uint256 reward = task.reward;

        if (approved) {
            task.status = TaskStatus.VERIFIED;
            task.completedAt = block.timestamp;
            task.assignedDrone.transfer(reward);
        } else {
            task.status = TaskStatus.FAILED;
            task.creator.transfer(reward);
        }

        emit TaskVerified(taskId, approved, reward);
    }

    function cancelTask(uint256 taskId) external taskExists(taskId) {
        Task storage task = tasks[taskId];
        if (task.status != TaskStatus.OPEN) revert InvalidTaskStatus(task.status, TaskStatus.OPEN);
        if (msg.sender != task.creator) revert NotTaskCreator();

        task.status = TaskStatus.CANCELLED;
        task.creator.transfer(task.reward);

        emit TaskCancelled(taskId);
    }

    function getTask(uint256 taskId) external view taskExists(taskId) returns (Task memory) {
        return tasks[taskId];
    }

    function getOpenTasks() external view returns (uint256[] memory) {
        uint256 openCount = 0;
        for (uint256 i = 0; i < taskCount; i++) {
            if (tasks[i].status == TaskStatus.OPEN) {
                openCount++;
            }
        }

        uint256[] memory openTaskIds = new uint256[](openCount);
        uint256 index = 0;
        for (uint256 i = 0; i < taskCount; i++) {
            if (tasks[i].status == TaskStatus.OPEN) {
                openTaskIds[index] = i;
                index++;
            }
        }

        return openTaskIds;
    }
}
