import { useState } from "react";

interface AgentMessageModalProps {
    onClose: () => void;
    message: string;
}

export function AgentMessageModal({ onClose, message }: AgentMessageModalProps) {
    const [copied, setCopied] = useState(false);
    const [editableMessage, setEditableMessage] = useState(message);

    const handleCopy = () => {
        navigator.clipboard.writeText(editableMessage);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-2xl bg-white rounded-3xl p-6 shadow-2xl space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-xl">✨</span>
                        <h3 className="text-xl font-bold text-[#1A2F25]">Agent Draft</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100"
                    >
                        ✕
                    </button>
                </div>

                <div className="p-4 bg-purple-50 rounded-xl border border-purple-100">
                    <p className="text-sm text-purple-800 font-medium">
                        This message was AI-generated based on the candidate's profile and your job context.
                        Feel free to edit before sending.
                    </p>
                </div>

                <textarea
                    className="w-full h-64 p-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 resize-none font-sans text-base leading-relaxed text-gray-700"
                    value={editableMessage}
                    onChange={(e) => setEditableMessage(e.target.value)}
                />

                <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleCopy}
                        className={`px-6 py-2.5 text-sm font-bold text-white rounded-xl transition-all shadow-lg shadow-purple-500/20 ${copied
                                ? "bg-emerald-500 hover:bg-emerald-600"
                                : "bg-purple-600 hover:bg-purple-700"
                            }`}
                    >
                        {copied ? "Copied to Clipboard!" : "Copy to Clipboard"}
                    </button>
                </div>
            </div>
        </div>
    );
}
