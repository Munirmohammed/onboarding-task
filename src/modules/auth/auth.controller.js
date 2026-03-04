const Joi = require("joi");
const service = require("./auth.service");

const registerSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(30).required(),
  phone:    Joi.string().pattern(/^\+?[1-9]\d{6,14}$/).required(),
  password: Joi.string().min(8).required(),
});

const loginSchema = Joi.object({
  username: Joi.string().required(),
  password: Joi.string().required(),
});

const phoneSchema  = Joi.object({ phone: Joi.string().required() });
const otpSchema    = Joi.object({ phone: Joi.string().required(), code: Joi.string().length(6).required() });
const resetSchema  = Joi.object({ resetToken: Joi.string().required(), newPassword: Joi.string().min(8).required() });

function validate(schema, body) {
  const { error, value } = schema.validate(body);
  if (error) throw Object.assign(error, { isJoi: true });
  return value;
}

exports.register = async (req, res, next) => {
  try {
    const data = validate(registerSchema, req.body);
    const result = await service.register(data);
    res.status(201).json(result);
  } catch (e) { next(e); }
};

exports.login = async (req, res, next) => {
  try {
    const data = validate(loginSchema, req.body);
    res.json(await service.login(data));
  } catch (e) { next(e); }
};

exports.forgotPassword = async (req, res, next) => {
  try {
    const { phone } = validate(phoneSchema, req.body);
    res.json(await service.forgotPassword({ phone }));
  } catch (e) { next(e); }
};

exports.verifyOtp = async (req, res, next) => {
  try {
    const data = validate(otpSchema, req.body);
    res.json(await service.verifyOtp(data));
  } catch (e) { next(e); }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const data = validate(resetSchema, req.body);
    res.json(await service.resetPassword(data));
  } catch (e) { next(e); }
};

exports.me = async (req, res, next) => {
  try {
    res.json(await service.getMe(req.user.id));
  } catch (e) { next(e); }
};