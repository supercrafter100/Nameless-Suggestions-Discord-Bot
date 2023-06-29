/* eslint-disable @typescript-eslint/no-unused-vars */
export default class UserFilter<T> {
    public static BANNED = new UserFilter<boolean>('banned');
    public static VERIFIED = new UserFilter<boolean>('verified');
    public static GROUP_ID = new UserFilter<number>('group_id');
    public static INTEGRATION = new UserFilter<string>('integration');

    private readonly filterName: string;

    constructor(filterName: string) {
        this.filterName = filterName;
    }

    public name(): string {
        return this.filterName;
    }
}
