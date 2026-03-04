const Joi = require("joi");
const service = require("./game.service");

const playSchema = Joi.object({
  action: Joi.string().valid("tap", "collect", "dodge").required(),
  nonce:  Joi.string().uuid().required(), // client must generate a fresh UUID per request
});

const pageSchema = Joi.object({
  page:  Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
});

function validate(schema, data) {
  const { error, value } = schema.validate(data);
  if (error) throw Object.assign(error, { isJoi: true });
  return value;
}

exports.play = async (req, res, next) => {
  try {
    const data = validate(playSchema, req.body);
    const result = await service.play({ userId: req.user.id, ...data });
    res.status(201).json(result);
  } catch (e) { next(e); }
};

exports.myScores = async (req, res, next) => {
  try {
    const { page, limit } = validate(pageSchema, req.query);
    res.json(await service.myScores({ userId: req.user.id, page, limit }));
  } catch (e) { next(e); }
};

exports.leaderboard = async (req, res, next) => {
  try {
    const { limit } = validate(Joi.object({ limit: Joi.number().integer().min(1).max(100).default(20) }), req.query);
    res.json(await service.leaderboard(limit));
  } catch (e) { next(e); }
};