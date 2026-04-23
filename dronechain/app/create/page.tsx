"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import TaskForm from "@/components/TaskForm";
import { generateTaskRequirements } from "@/lib/aiService";
import { createTask } from "@/lib/contract";
import type { TaskRequirements } from "@/lib/types";

type GeneratedRequirements = TaskRequirements & { reasoning?: string };

type Notification = {
  message: string;
  type: "success" | "error";
};

export default function CreatePage() {
  const router = useRouter();

  const [generatedRequirements, setGeneratedRequirements] =
    useState<GeneratedRequirements | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [notification, setNotification] = useState<Notification | null>(null);

  const isLoading = isGenerating || isCreating;

  // Auto-dismiss notification after 3s
  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => setNotification(null), 3000);
    return () => clearTimeout(timer);
  }, [notification]);

  async function handleGenerateRequirements(title: string, desc: string) {
    setIsGenerating(true);
    try {
      const result = await generateTaskRequirements(title, desc);
      setGeneratedRequirements(result);
    } catch (err) {
      setNotification({
        message: "AI generation failed: " + (err instanceof Error ? err.message : String(err)),
        type: "error",
      });
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleCreateTask(title: string, desc: string, reward: string) {
    if (!generatedRequirements) return;
    setIsCreating(true);
    try {
      const txHash = await createTask(generatedRequirements, reward);
      setNotification({ message: "Task created! TX: " + txHash, type: "success" });
      setTimeout(() => router.push("/"), 2000);
    } catch (err) {
      setNotification({
        message: "Failed to create task: " + (err instanceof Error ? err.message : String(err)),
        type: "error",
      });
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold text-center mb-8">Create New Task</h1>

      {/* Notification */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-lg text-sm font-medium shadow-lg ${
            notification.type === "success"
              ? "bg-green-600 text-white"
              : "bg-red-600 text-white"
          }`}
        >
          {notification.message}
        </div>
      )}

      <TaskForm
        walletAddress={null}
        onGenerate={handleGenerateRequirements}
        onCreateTask={handleCreateTask}
        generatedRequirements={generatedRequirements}
        isLoading={isLoading}
      />
    </div>
  );
}
