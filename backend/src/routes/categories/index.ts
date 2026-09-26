import { Hono } from "hono";
import {
  getCategoriesHandler,
  getCategoryByIdHandler,
  createCategoryHandler,
  updateCategoryHandler,
  deleteCategoryHandler,
} from "./categories";

const categoriesRouter = new Hono();

// GET / - List all categories
categoriesRouter.get("/", getCategoriesHandler);

// GET /:id - Get single category by ID or slug
categoriesRouter.get("/:id", getCategoryByIdHandler);

// POST / - Create a new category
categoriesRouter.post("/", createCategoryHandler);

// PUT /:id & PATCH /:id - Update category
categoriesRouter.put("/:id", updateCategoryHandler);
categoriesRouter.patch("/:id", updateCategoryHandler);

// DELETE /:id - Delete or deactivate category
categoriesRouter.delete("/:id", deleteCategoryHandler);

export { categoriesRouter };
export * from "./category.schema";
export * from "./categories";
