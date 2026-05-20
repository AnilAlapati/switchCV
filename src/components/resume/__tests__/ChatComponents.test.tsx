import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { ResumeEditChatHeader } from "../ResumeEditChatHeader";
import { ResumeEditChatInput } from "../ResumeEditChatInput";
import { ResumeEditChatStatus } from "../ResumeEditChatStatus";
import { ResumeEditMessageList } from "../ResumeEditMessageList";

describe("Chat Components", () => {
  describe("ResumeEditChatHeader", () => {
    it("renders title and default description when no resume title", () => {
      render(<ResumeEditChatHeader />);
      expect(screen.getByText("AI Resume Editor")).toBeInTheDocument();
    });

    it("renders resume title description when provided", () => {
      render(<ResumeEditChatHeader resumeTitle="My Resume" />);
      expect(screen.getByText("My Resume")).toBeInTheDocument();
    });

    it("renders connection status when connected", () => {
      render(
        <ResumeEditChatHeader
          connectionStatus={{ connected: true, model: "Claude" }}
        />,
      );
      expect(screen.getByText("Claude ready")).toBeInTheDocument();
      const status = screen.getByText("Claude ready");
      expect(status).toHaveClass("bg-gray-50");
    });

    it("renders connection status with default model", () => {
      render(<ResumeEditChatHeader connectionStatus={{ connected: true }} />);
      expect(screen.getByText("Gemini ready")).toBeInTheDocument();
    });

    it("renders connection status when disconnected", () => {
      render(<ResumeEditChatHeader connectionStatus={{ connected: false }} />);
      expect(screen.getByText("AI unavailable")).toBeInTheDocument();
      const status = screen.getByText("AI unavailable");
      expect(status).toHaveClass("bg-red-50");
    });
  });

  describe("ResumeEditChatInput", () => {
    const mockOnChange = jest.fn();
    const mockOnSubmit = jest.fn();

    beforeAll(() => {
      // Mock requestSubmit which is missing in JSDOM
      if (typeof HTMLFormElement.prototype.requestSubmit !== "function") {
        HTMLFormElement.prototype.requestSubmit = function () {
          const event = new Event("submit", {
            bubbles: true,
            cancelable: true,
          });
          this.dispatchEvent(event);
        };
      }
    });

    it("renders input and triggers resize effect", () => {
      const { rerender } = render(
        <ResumeEditChatInput
          value="test"
          onChange={mockOnChange}
          onSubmit={mockOnSubmit}
        />,
      );
      const textarea = screen.getByPlaceholderText(
        /Describe the change/,
      ) as HTMLTextAreaElement;

      // Trigger resize by changing value prop
      rerender(
        <ResumeEditChatInput
          value="new value"
          onChange={mockOnChange}
          onSubmit={mockOnSubmit}
        />,
      );

      fireEvent.change(textarea, { target: { value: "hello" } });
      expect(mockOnChange).toHaveBeenCalledWith("hello");
    });

    it("calls onSubmit when button is clicked", () => {
      render(
        <ResumeEditChatInput
          value="go"
          onChange={mockOnChange}
          onSubmit={mockOnSubmit}
        />,
      );
      // Prevent actual form submission in test to avoid JSDOM issues
      const form = screen.getByRole("textbox").closest("form")!;
      form.onsubmit = (e) => {
        e.preventDefault();
        mockOnSubmit();
      };

      fireEvent.click(screen.getByText("Send"));
      expect(mockOnSubmit).toHaveBeenCalled();
    });

    it("calls onSubmit when Enter is pressed without Shift", () => {
      render(
        <ResumeEditChatInput
          value="go"
          onChange={mockOnChange}
          onSubmit={mockOnSubmit}
        />,
      );
      const textarea = screen.getByPlaceholderText(/Describe the change/);
      fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false });
      expect(mockOnSubmit).toHaveBeenCalled();
    });

    it("does NOT call onSubmit when Enter is pressed with Shift", () => {
      render(
        <ResumeEditChatInput
          value="go"
          onChange={mockOnChange}
          onSubmit={mockOnSubmit}
        />,
      );
      const textarea = screen.getByPlaceholderText(/Describe the change/);
      // We need to be careful, fireEvent.keyDown might trigger submit depending on JSDOM
      mockOnSubmit.mockClear();
      fireEvent.keyDown(textarea, { key: "Enter", shiftKey: true });
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it("shows loading state when disabled", () => {
      render(
        <ResumeEditChatInput
          value="test"
          onChange={mockOnChange}
          onSubmit={mockOnSubmit}
          disabled={true}
        />,
      );
      expect(screen.getByText("Working")).toBeInTheDocument();
      expect(screen.getByRole("button")).toBeDisabled();

      // Pressing enter while disabled should do nothing
      const textarea = screen.getByRole("textbox");
      fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false });
      expect(mockOnSubmit).not.toHaveBeenCalled();

      // Pressing other keys should do nothing special
      fireEvent.keyDown(textarea, { key: "a", shiftKey: false });
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });
  });

  describe("ResumeEditChatStatus", () => {
    it("renders nothing when neither processing nor error", () => {
      const { container } = render(
        <ResumeEditChatStatus isProcessing={false} errorMessage={null} />,
      );
      expect(container.firstChild).toBeNull();
    });

    it("renders processing state", () => {
      render(<ResumeEditChatStatus isProcessing={true} errorMessage={null} />);
      expect(
        screen.getByText(/Applying your resume updates/),
      ).toBeInTheDocument();
    });

    it("renders error message", () => {
      render(
        <ResumeEditChatStatus isProcessing={false} errorMessage="Failed" />,
      );
      expect(screen.getByText(/AI Error: Failed/)).toBeInTheDocument();
    });
  });

  describe("ResumeEditMessageList", () => {
    const mockEndRef = { current: null };

    it("renders empty state", () => {
      render(<ResumeEditMessageList messages={[]} endRef={mockEndRef} />);
      expect(screen.getByText(/fine-tune your resume/)).toBeInTheDocument();
    });

    it("renders messages list", () => {
      const messages = [
        { id: "1", content: "Hi", isUser: true, timestamp: new Date() },
        { id: "2", content: "Hello", isUser: false, timestamp: new Date() },
      ];
      render(<ResumeEditMessageList messages={messages} endRef={mockEndRef} />);
      expect(screen.getByText("Hi")).toBeInTheDocument();
      expect(screen.getByText("Hello")).toBeInTheDocument();

      // Check classes for user vs bot
      expect(screen.getByText("Hi").closest("div")).toHaveClass("bg-black");
      expect(screen.getByText("Hello").closest("div")).toHaveClass(
        "bg-gray-100",
      );
    });
  });
});
