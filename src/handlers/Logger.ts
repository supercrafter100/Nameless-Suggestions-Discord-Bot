/* eslint-disable @typescript-eslint/no-explicit-any */
import chalk from 'chalk';

export default class Logger {
    //
    //	Static Methods
    //

    public static makeSize(string: string, length: number): string {
        if (string.length >= length) return string.slice(0, length);
        return string + ' '.repeat(length - string.length);
    }

    public static getLineAndChar(depth = 3): [script: string, line: number, char: number] {
        const stack = this.getStack();

        const line = stack.split('\n')[depth + 1];
        if (!line) return ['', -1, -1];

        const match = line.match(/.*\\(.+.[tj]s):(\d+):(\d+)\)?$/) ?? [];
        return [match[1] ?? '', parseInt(match[2] ?? -1), parseInt(match[3] ?? -1)];
    }

    public static getStack(startSlice = 1) {
        const error = new Error();
        if (!error.stack) return '';
        const stack = error.stack.split('\n');
        return stack.slice(startSlice, stack.length).join('\n').trim();
    }

    //
    //	Class methods
    //

    constructor(private size: number = 5, private showBlank: boolean = true) {}

    public prefix: string | undefined = undefined;

    public loghandler(prefix: string, type: 'log' | 'warn' | 'error', ...messages: unknown[]) {
        if (this.prefix) {
            console[type](
                chalk.bold(prefix),
                chalk.gray('[') + this.prefix + chalk.gray(']'),
                ...messages,
                chalk.grey('(') + chalk.cyan(Logger.getLineAndChar().join(':')) + chalk.grey(')')
            );
        } else {
            console[type](
                chalk.bold(prefix),
                ...messages,
                chalk.grey('(') + chalk.cyan(Logger.getLineAndChar().join(':')) + chalk.grey(')')
            );
        }
    }

    //
    //	Debug Messages
    //

    public blankHandler() {
        console.log('');
    }

    public debug(...messages: unknown[]) {
        this.loghandler(chalk.bgWhite.black(' ' + Logger.makeSize('DEBUG', this.size) + ' '), 'log', ...messages);
    }

    public info(...messages: unknown[]) {
        this.loghandler(chalk.bgGreen(' ' + Logger.makeSize('INFO', this.size) + ' '), 'log', ...messages);
    }

    public warn(...messages: unknown[]) {
        this.loghandler(chalk.bgYellow.black(' ' + Logger.makeSize('WARN', this.size) + ' '), 'warn', ...messages);
    }

    public blank() {
        if (this.showBlank) this.blankHandler();
    }

    /**
     * Logs the messages and displays the error
     */
    public error(...messages: [...unknown[], Error]): void;
    /**
     * Logs the error, creates a new error stack
     */
    public error(...messages: any[]): void;
    public error(...messages: any[]) {
        let stack: string;

        if (messages[messages.length - 1] instanceof Error) stack = messages.pop().stack;
        else stack = Logger.getStack(3);

        this.loghandler(
            chalk.bgRed(' ' + Logger.makeSize('ERROR', this.size) + ' '),
            'error',
            ...messages,
            '\n',
            chalk.red('>'),
            stack
        );
    }
}
