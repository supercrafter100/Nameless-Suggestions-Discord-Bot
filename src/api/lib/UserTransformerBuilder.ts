import UserTransformer from './UserTransformer';

export default function <T>(name: UserTransformer<T>, value: T) {
    return `${name}:${typeof value === 'object' ? (value as unknown[]).join(':') : value}`;
}
