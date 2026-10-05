import { validationResult } from "express-validator";

const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(422).json({
      success: false,
      message: "Validation failed.",
      errors: errors.array().map(({ path, msg }) => ({ field: path, message: msg })),
    });
  }

  next();
};

export default validate;
