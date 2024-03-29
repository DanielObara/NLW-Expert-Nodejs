import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { randomUUID } from "crypto";
import { redis } from "../../lib/redis";
import { voting } from "../../utils/voting-pub-sub";

export async function voteOnPoll(app: FastifyInstance) {
	app.post("/polls/:pollId/votes", async (request, reply) => {
		const voteOnPollBody = z.object({
			pollOptionId: z.string().uuid(),
		});

		const voteOnPollParams = z.object({
			pollId: z.string().uuid(),
		});

		const { pollId } = voteOnPollParams.parse(request.params);
		const { pollOptionId } = voteOnPollBody.parse(request.body);

		let { sessionId } = request.cookies;
		let message = "Vote registered";

		if (sessionId) {
			const userAlreadyVotedOnPoll = await prisma.vote.findUnique({
				where: {
					sessionId_pollId: {
						pollId,
						sessionId,
					},
				},
			});

			if (
				userAlreadyVotedOnPoll &&
				userAlreadyVotedOnPoll.pollOptionId !== pollOptionId
			) {
				await prisma.vote.delete({
					where: {
						id: userAlreadyVotedOnPoll.id,
					},
				});

				message = "Vote updated";

				const votes = await redis.zincrby(
					pollId,
					-1,
					userAlreadyVotedOnPoll.pollOptionId
				);

				voting.publish(pollId, {
					pollOptionId: userAlreadyVotedOnPoll.pollOptionId,
					votes: Number(votes),
				});
			} else if (userAlreadyVotedOnPoll) {
				return reply.status(400).send({ error: "You can only vote once" });
			}
		}

		if (!sessionId) {
			sessionId = randomUUID();

			reply.setCookie("sessionId", sessionId, {
				path: "/",
				maxAge: 60 * 60 * 24 * 7, // 1 week
				signed: true,
				httpOnly: true, // Just our backend can read information of this cookie
				sameSite: "strict",
			});
		}

		await prisma.vote.create({
			data: {
				sessionId,
				pollId,
				pollOptionId,
			},
		});

		const votes = await redis.zincrby(pollId, 1, pollOptionId);

		voting.publish(pollId, { pollOptionId, votes: Number(votes) });

		return reply.status(201).send({ message });
	});
}
