export default class RingBuffer<T> {
    private buffer: T[];
    private capacity: number;
    private start = 0;
    private length = 0;

    constructor(capacity: number) {
        this.capacity = capacity;
        this.buffer = new Array(capacity);
    }

    push(item: T) {
        const idx = (this.start + this.length) % this.capacity;

        if (this.length < this.capacity) {
            this.buffer[idx] = item;
            this.length++;
        } else {
            this.buffer[idx] = item;
            this.start = (this.start + 1) % this.capacity;
        }
    }

    pushMany(items: T[]) {
        for (let i = 0; i < items.length; i++) {
            this.push(items[i]);
        }
    }

    toArray(): T[] {
        if (this.length === this.capacity) {
            return [...this.buffer.slice(this.start), ...this.buffer.slice(0, this.start)];
        }
        return this.buffer.slice(0, this.length);
    }

    clear() {
        this.start = 0;
        this.length = 0;
    }

    size(): number {
        return this.length;
    }
}
