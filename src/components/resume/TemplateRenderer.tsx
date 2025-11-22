import React from "react";
import { ResumeProfile, ResumeTemplate } from "@/types";

interface TemplateRendererProps {
  template: ResumeTemplate;
  data: ResumeProfile;
}

export const TemplateRenderer: React.FC<TemplateRendererProps> = ({
  template,
  data,
}) => {
  // Helper to get field value from data
  const getFieldValue = (fieldId: string) => {
    switch (fieldId) {
      case "name":
        return data.contact?.email?.value ? "User Name" : "User Name"; // Placeholder as name isn't in root
      case "title":
        return data.title;
      case "email":
        return data.contact?.email?.value;
      case "phone":
        return data.contact?.phone?.value;
      case "summary":
        return data.summary;
      case "skills":
        return data.skills;
      case "experience":
        return data.experience;
      case "education":
        return data.education;
      case "projects":
        return data.projects;
      default:
        return null;
    }
  };

  const renderField = (field: any, value: any) => {
    if (!value) return null;

    switch (field.type) {
      case "text":
        return (
          <div key={field.id} className="mb-2">
            <span className="font-semibold">{field.label}:</span> {value}
          </div>
        );
      case "textarea":
        return (
          <p key={field.id} className="whitespace-pre-wrap mb-4">
            {value}
          </p>
        );
      case "list":
        return (
          <div key={field.id} className="flex flex-wrap gap-2 mb-4">
            {Array.isArray(value) &&
              value.map((item: any, i: number) => (
                <span key={i} className="bg-gray-100 px-2 py-1 rounded text-sm">
                  {item.name || item}
                </span>
              ))}
          </div>
        );
      case "complex_list":
        return (
          <div key={field.id} className="space-y-4 mb-4">
            {Array.isArray(value) &&
              value.map((item: any, i: number) => (
                <div key={i} className="border-l-2 border-gray-200 pl-4">
                  <h4 className="font-bold">
                    {item.role || item.degree || item.name}
                  </h4>
                  <div className="text-sm text-gray-600">
                    {item.company || item.institution}
                  </div>
                  <p className="text-sm mt-1">{item.description}</p>
                </div>
              ))}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-white p-8 shadow-lg max-w-4xl mx-auto text-gray-800">
      <h1 className="text-3xl font-bold mb-2">{data.title}</h1>
      <p className="text-sm text-gray-500 mb-8">{template.name} Template</p>

      {template.sections
        .sort((a, b) => a.order - b.order)
        .map((section) => (
          <div key={section.id} className="mb-8">
            <h3 className="text-xl font-bold border-b-2 border-gray-800 mb-4 uppercase tracking-wide">
              {section.title}
            </h3>
            {section.fields.map((field) =>
              renderField(field, getFieldValue(field.id))
            )}
          </div>
        ))}
    </div>
  );
};
