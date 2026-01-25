import React from "react";
import { render, screen } from "@testing-library/react";
import { 
  SectionCard, 
  MailIcon, 
  PhoneIcon, 
  LocationIcon, 
  LinkIcon, 
  CodeIcon 
} from "../ResumeVisualPrimitives";

describe("ResumeVisualPrimitives", () => {
  describe("SectionCard", () => {
    it("renders title and children", () => {
      render(
        <SectionCard title="Test Section">
          <p>Child Content</p>
        </SectionCard>
      );
      expect(screen.getByText("Test Section")).toBeInTheDocument();
      expect(screen.getByText("Child Content")).toBeInTheDocument();
      // Should also render the first letter of title in the icon box
      expect(screen.getByText("T")).toBeInTheDocument();
    });
  });

  describe("Icons", () => {
    it("renders MailIcon", () => {
      const { container } = render(<MailIcon />);
      expect(container.querySelector("svg")).toBeInTheDocument();
    });

    it("renders PhoneIcon", () => {
      const { container } = render(<PhoneIcon />);
      expect(container.querySelector("svg")).toBeInTheDocument();
    });

    it("renders LocationIcon", () => {
      const { container } = render(<LocationIcon />);
      expect(container.querySelector("svg")).toBeInTheDocument();
    });

    it("renders LinkIcon", () => {
      const { container } = render(<LinkIcon />);
      expect(container.querySelector("svg")).toBeInTheDocument();
    });

    it("renders CodeIcon", () => {
      const { container } = render(<CodeIcon />);
      expect(container.querySelector("svg")).toBeInTheDocument();
    });
  });
});
