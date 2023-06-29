export default class UserTransformer<T> {
    public static ID = new UserTransformer<string>('id');
    public static USERNAME = new UserTransformer<string>('username');
    public static INTEGRATION_ID = new UserTransformer<[string, string]>('integration_id');
    public static INTEGRATION_NAME = new UserTransformer<[string, string]>('integration_name');

    private readonly filterName: string;

    constructor(filterName: string) {
        this.filterName = filterName;
    }

    public name(): string {
        return this.filterName;
    }
}
