/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-var-requires */
import chalk from 'chalk';
import { ButtonInteraction, ClientEvents } from 'discord.js';
import Bot from '../managers/Bot';
import InteractionHandler from './InteractionHandler';

export default class EventHandler extends InteractionHandler<EventCollector> {
    public extension = 'event';

    //
    //	Events
    //

    protected requireReady = false;

    protected async onStart(): Promise<void> {
        null;
    }

    protected onLoadFile(path: string) {
        let event: Partial<Event<never>> = {};

        try {
            event = new (require(path).default ?? require(path))(this.client);
        } catch (e) {
            this.logger.error("Couldn't load event", path, e);
            process.exit(1);
        }

        //	Getting event
        if (!event.event) return;
        const eventData = this.cache.get(event.event) ?? this.createEvent(event.event);
        if (!eventData) return;
        eventData.push(event as Event<never>);

        //	Adding event

        this.cache.set(event.event, eventData);

        this.logger.debug(`Registered event ${chalk.green(event.event)}`);
    }

    //
    //	Create Event
    //

    protected createEvent(event: string) {
        this.client.on(event, (...args: unknown[]) => this.handle(event, args));
        const value = this.cache.set(event, []).get(event);

        if (!value) return;
        return value;
    }

    //
    //	Handlers
    //

    public async handle(event: string, args: unknown[]): Promise<any> {
        const eventData = this.cache.get(event);
        if (!eventData) return;
        eventData.forEach((e) => e.run(...args));
    }
}

export type EventCollector<T extends keyof ClientEvents = any> = Event<T>[];
export type RunEvent = (interaction: ButtonInteraction) => Promise<any | void> | any | void;

export abstract class Event<T extends keyof ClientEvents> {
    constructor(protected readonly client: Bot) {}

    public abstract readonly event: string;
    public abstract run(...args: ClientEvents[T]): any;

    public get logger() {
        return this.client.logger;
    }
}
