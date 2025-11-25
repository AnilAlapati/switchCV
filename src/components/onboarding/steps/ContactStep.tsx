import { ResumeProfile, Visibility } from "@/types";
import { FormInput, VisibilityControl } from "../FormComponents";
import { ChangeEvent } from "react";

interface ContactStepProps {
  profile: Partial<ResumeProfile>;
  onChange: (updates: Partial<ResumeProfile>) => void;
}

/**
 * Step 5: Contact Information
 * Handles email and phone with visibility controls
 */
export function ContactStep({ profile, onChange }: ContactStepProps) {
  const contact = profile.contact || {
    email: { value: "", visibility: "masked" as const },
    phone: { value: "", visibility: "masked" as const },
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium">Contact Information</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <FormInput
            label="Email"
            type="email"
            value={contact.email?.value || ""}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              onChange({
                contact: {
                  ...contact,
                  email: {
                    ...contact.email!,
                    value: e.target.value,
                  },
                },
              })
            }
            placeholder="your.email@example.com"
          />
          <div className="mt-2">
            <VisibilityControl
              value={contact.email?.visibility || "masked"}
              onChange={(v: Visibility) =>
                onChange({
                  contact: {
                    ...contact,
                    email: {
                      ...contact.email!,
                      visibility: v,
                    },
                  },
                })
              }
            />
          </div>
        </div>
        <div>
          <FormInput
            label="Phone"
            type="tel"
            value={contact.phone?.value || ""}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              onChange({
                contact: {
                  ...contact,
                  phone: {
                    ...contact.phone!,
                    value: e.target.value,
                  },
                },
              })
            }
            placeholder="+1 (555) 123-4567"
          />
          <div className="mt-2">
            <VisibilityControl
              value={contact.phone?.visibility || "masked"}
              onChange={(v: Visibility) =>
                onChange({
                  contact: {
                    ...contact,
                    phone: {
                      ...contact.phone!,
                      visibility: v,
                    },
                  },
                })
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}
