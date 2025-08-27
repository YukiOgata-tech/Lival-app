// functions/src/eduAI-classify.ts
import {onRequest} from "firebase-functions/v2/https";
import {defineSecret} from "firebase-functions/params";

const OPENAI_API_KEY = defineSecret("OPENAI_API_KEY");
const DEEPSEEK_API_KEY = defineSecret("DEEPSEEK_API_KEY"); // 使うなら

const OPENAI_URL = "https://api.openai.com/v1/responses";
const OPENAI_MODEL = process.env.OPENAI_CLASSIFIER_MODEL ?? "gpt-4.1-mini";

const DS_BASE = process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com/v1";
const DS_MODEL = process.env.DEEPSEEK_ROUTER_MODEL ?? "deepseek-chat";

type Route = "tutor" | "counselor" | "planner";

export const eduAIClassify = onRequest(
  {cors: true, region: "asia-northeast1", secrets: [OPENAI_API_KEY, DEEPSEEK_API_KEY]},
  async (req, res) => {
    if (req.method === "OPTIONS") {
      res.status(200).send("ok"); return;
    }

    try {
      const {text} = req.body as { text: string };
      if (!text) {
        res.status(400).json({error: "text is required"}); return;
      }

      // 1) DeepSeek（成功なら即返す）
      try {
        const r = await fetch(`${DS_BASE}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${DEEPSEEK_API_KEY.value()}`,
          },
          body: JSON.stringify({
            model: DS_MODEL,
            temperature: 0,
            messages: [
              {
                role: "system",
                content:
                  "あなたはチャット内容を分類する。最小JSONのみを返す: {\"route\":\"tutor|counselor|planner\"}。" +
                  "基準: 学習解説→tutor / 進学情報→counselor / 学習計画→planner",
              },
              {role: "user", content: text},
            ],
          }),
        });
        if (!r.ok) throw new Error(`deepseek ${r.status}`);
        const j = await r.json();
        const raw = (j.choices?.[0]?.message?.content ?? "").trim();
        const route = JSON.parse(raw).route as Route;
        if (!["tutor", "counselor", "planner"].includes(route)) throw new Error("invalid route");
        res.json({route}); return;
      } catch (_) {/* fallback to OpenAI */}

      // 2) OpenAI Responses
      const r2 = await fetch(OPENAI_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${OPENAI_API_KEY.value()}`,
        },
        body: JSON.stringify({
          model: OPENAI_MODEL,
          input: [
            {role: "system", content: [{type: "input_text", text:
              "ユーザー発話を {\"route\":\"tutor\"|\"counselor\"|\"planner\"} でJSON出力。" +
              "基準: 学習解説→tutor / 進学情報→counselor / 学習計画→planner",
            }]},
            {role: "user", content: [{type: "input_text", text}]},
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "Route",
              schema: {
                type: "object",
                properties: {route: {type: "string", enum: ["tutor", "counselor", "planner"]}},
                required: ["route"],
                additionalProperties: false,
              },
              strict: true,
            },
          },
          max_output_tokens: 60,
          temperature: 0,
        }),
      });
      const d2 = await r2.json();
      const route: Route = d2.output_json?.route ?? (() => {
        try {
          return JSON.parse(d2.output_text).route;
        } catch {
          return "tutor";
        }
      })();

      res.json({route});
    } catch (e: any) {
      res.status(500).json({error: e?.message ?? "unknown error"});
    }
  }
);
