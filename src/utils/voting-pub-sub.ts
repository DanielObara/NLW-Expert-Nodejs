type Message = { pollOptionId: string; votes: number };

type Subscriber = (message: Message) => void;

class VotingPubSub {
	private readonly channels: Record<string, Subscriber[]> = {};

	subscribe(pollId: string, subscriber: Subscriber) {
		if (!this.channels[pollId]) {
			this.channels[pollId] = [];
		}

		this.channels[pollId].push(subscriber);
	}

	publish(pollId: string, message: Message) {
		const subscribers = this.channels[pollId] || [];

		for (const subscriber of subscribers) {
			subscriber(message);
		}
	}
}

export const voting = new VotingPubSub();
