import { reloadPage } from "./navigation";
import { getWindow } from "./window";

jest.mock("./window");

describe("navigation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("reloadPage", () => {
    it("should reload page if window exists", () => {
      const mockReload = jest.fn();
      (getWindow as jest.Mock).mockReturnValue({
        location: {
          reload: mockReload,
        },
      });

      reloadPage();
      expect(mockReload).toHaveBeenCalled();
    });

    it("should do nothing if window does not exist", () => {
      (getWindow as jest.Mock).mockReturnValue(null);
      expect(() => reloadPage()).not.toThrow();
    });
  });
});
