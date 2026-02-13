import React from "react";
import { Sparkles } from "lucide-react";
import { ParsedJDPreview } from "./JDUpload";

/**
 * Card showing the parsed JD requirements
 */
export function ParsedJDCard({ parsedJD }: { parsedJD: ParsedJDPreview }) {
    return (
        <div
            className="bg-gradient-to-r from-indigo-50 to-gray-50 border border-indigo-100 rounded-xl p-5"
            data-testid="parsed-jd-preview"
        >
            <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <h3 className="font-semibold text-gray-900">Extracted Requirements</h3>
            </div>

            <div className="space-y-3">
                {/* Title */}
                <div>
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Position
                    </span>
                    <p className="text-gray-900 font-medium">{parsedJD.title}</p>
                </div>

                {/* Required Skills */}
                {parsedJD.requiredSkills.length > 0 && (
                    <div>
                        <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Required Skills
                        </span>
                        <div className="flex flex-wrap gap-2 mt-1">
                            {parsedJD.requiredSkills.map((skill) => (
                                <span
                                    key={skill}
                                    className="px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full"
                                >
                                    {skill}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Preferred Skills */}
                {parsedJD.preferredSkills.length > 0 && (
                    <div>
                        <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Preferred Skills
                        </span>
                        <div className="flex flex-wrap gap-2 mt-1">
                            {parsedJD.preferredSkills.map((skill) => (
                                <span
                                    key={skill}
                                    className="px-2 py-1 bg-amber-100 text-amber-800 text-xs font-medium rounded-full"
                                >
                                    {skill}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Experience, Location, Work Mode */}
                <div className="flex flex-wrap gap-4 text-sm">
                    {parsedJD.minExperience !== null && (
                        <div className="flex items-center gap-1">
                            <span className="text-gray-500">Experience:</span>
                            <span className="font-medium">
                                {parsedJD.minExperience}+ years
                            </span>
                        </div>
                    )}
                    {parsedJD.location !== null && (
                        <div className="flex items-center gap-1">
                            <span className="text-gray-500">Location:</span>
                            <span className="font-medium">{parsedJD.location}</span>
                        </div>
                    )}
                    {parsedJD.workMode !== null && (
                        <div className="flex items-center gap-1">
                            <span className="text-gray-500">Work Mode:</span>
                            <span className="font-medium capitalize">
                                {parsedJD.workMode}
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
