import UserFilter from './UserFilter';

export default class FilteredUserListBuilder {
    private filters: Map<UserFilter<unknown>, unknown> = new Map();
    private operator: 'AND' | 'OR' = 'AND';

    public withFilter<T>(filter: UserFilter<T>, value: T) {
        this.filters.set(filter, value);
        return this;
    }

    public all() {
        this.operator = 'AND';
        return this;
    }

    public any() {
        this.operator = 'OR';
        return this;
    }

    public build() {
        const parameters: string[] = [];
        if (this.filters != null) {
            parameters.push('operator');
            parameters.push(this.operator);
            parameters.push('limit');
            parameters.push('0');
            for (const [k, v] of this.filters) {
                parameters.push(k.name());
                parameters.push(v as string);
            }
        }
        return parameters;
    }
}
