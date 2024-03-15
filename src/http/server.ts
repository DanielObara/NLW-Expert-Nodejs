import fastify from "fastify";
import cookie from "@fastify/cookie";
import websocket from "@fastify/websocket";
import { createPoll } from "./routes/create-poll";
import { getPoll } from "./routes/get-poll";
import { voteOnPoll } from "./routes/vote-on-poll";
import { pollResults } from "./ws/poll-results";

const app = fastify();

app.register(cookie, {
	secret: "my-secret", // for cookies signature
	hook: "onRequest", // set to false to disable cookie autoparsing or set autoparsing on any of the following hooks: 'onRequest', 'preParsing', 'preHandler', 'preValidation'. default: 'onRequest'
});

app.register(websocket);

app.register(createPoll);
app.register(getPoll);
app.register(voteOnPoll);

app.register(pollResults);

app
	.listen({ port: 3333 })
	.then(() => {
		console.log("HTTP server is running");
	})
	.catch((err) => {});
