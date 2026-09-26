import { Hono } from "hono";
import { getHistoryHandler } from "./get-history";

const historyRouter = new Hono();

// GET / - List all stock ledger movement history
historyRouter.get("/", getHistoryHandler);

export { historyRouter };
export * from "./get-history";
