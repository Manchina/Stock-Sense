import { Hono } from "hono";
import { authMiddleware } from "../../middleware/auth.middleware";
import { authController } from "./auth.controller";

export const authRoutes = new Hono();

authRoutes.post("/signup", (c) => authController.signup(c));
authRoutes.post("/login", (c) => authController.login(c));
authRoutes.post("/refresh", (c) => authController.refresh(c));
authRoutes.post("/otp/request", (c) => authController.requestOtp(c));
authRoutes.post("/otp/verify", (c) => authController.verifyOtp(c));
authRoutes.post("/reset-password", (c) => authController.resetPassword(c));
authRoutes.get("/me", authMiddleware, (c) => authController.getMe(c));
