import { Router } from "express";

const router = Router();

router.route("/register").post();
router.route("/login").post();
router.route("/logout").post();
router.route("/refresh-token").post();
router.route("/change-password").post();
router.route("/current-user").get();
router.route("/update-account").patch();

export default router;
