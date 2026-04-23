"use client";

import TaskForm from "@/components/TaskForm";

export default function CreatePage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold text-center mb-8">Create New Task</h1>
      <TaskForm walletAddress={null} />
    </div>
  );
}
