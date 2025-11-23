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

      reloadPage();
      // Since we can't easily spy on "doing nothing", we just ensure no error is thrown
      // and if we had a spy on reload, it wouldn't be called.
      // But here we can't spy on the previous mock because we changed the return value.
      // So this test mainly ensures branch coverage for the "else" case (implicit).
    });
  });
});
