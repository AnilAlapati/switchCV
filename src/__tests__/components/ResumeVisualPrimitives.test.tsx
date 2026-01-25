import React from "react";
import { render, screen } from "../__support__/testUtils";
import {
  SectionCard,
  MailIcon,
  PhoneIcon,
  LocationIcon,
  LinkIcon,
  CodeIcon,
} from "@/components/resume/ResumeVisualPrimitives";

describe("ResumeVisualPrimitives", () => {
  describe("SectionCard", () => {
    it("renders title correctly", () => {
      render(
        <SectionCard title="Experience">
          <div>Child Content</div>
        </SectionCard>,
      );
      expect(screen.getByText("Experience")).toBeInTheDocument();
      expect(screen.getByText("Child Content")).toBeInTheDocument();
    });

    it("uses the first letter of the title in the square icon", () => {
      render(
        <SectionCard title="Education">
          <div>Content</div>
        </SectionCard>,
      );
      expect(screen.getByText("E")).toBeInTheDocument();
    });
  });

  describe("Icons", () => {
    it("MailIcon renders an svg", () => {
      const { container } = render(<MailIcon />);
      expect(container.querySelector("svg")).toBeInTheDocument();
    });

    it("PhoneIcon renders an svg", () => {
      const { container } = render(<PhoneIcon />);
      expect(container.querySelector("svg")).toBeInTheDocument();
    });

    it("LocationIcon renders an svg", () => {
      const { container } = render(<LocationIcon />);
      expect(container.querySelector("svg")).toBeInTheDocument();
    });

    it("LinkIcon renders an svg", () => {
      const { container } = render(<LinkIcon />);
      expect(container.querySelector("svg")).toBeInTheDocument();
    });

    it("CodeIcon renders an svg", () => {
      const { container } = render(<CodeIcon />);
      expect(container.querySelector("svg")).toBeInTheDocument();
    });
  });
});
