import { DurableObject } from "cloudflare:workers";
import { createDefaultEvent, normalizeStoreForDo } from "./logic.js";

/**
 * Strongly-consistent tournament state.
 * KV was eventually consistent, so resets could be overwritten by in-flight votes.
 */
export class OshiWarsStore extends DurableObject {
  async getState() {
    const raw = await this.ctx.storage.get("events");
    const rev = (await this.ctx.storage.get("rev")) || 0;
    const { store, dirty } = normalizeStoreForDo(raw);
    if (dirty) {
      await this.ctx.storage.put("events", store);
      await this.ctx.storage.put("rev", rev + 1);
      return { store, rev: rev + 1 };
    }
    return { store, rev };
  }

  /** CAS write — returns false if another write won the race. */
  async saveIfRev(store, expectedRev) {
    return this.ctx.blockConcurrencyWhile(async () => {
      const rev = (await this.ctx.storage.get("rev")) || 0;
      if (rev !== expectedRev) return false;
      await this.ctx.storage.put("events", store);
      await this.ctx.storage.put("rev", rev + 1);
      return true;
    });
  }

  /** Force overwrite (used by reset). */
  async forceSave(store) {
    return this.ctx.blockConcurrencyWhile(async () => {
      const rev = (await this.ctx.storage.get("rev")) || 0;
      await this.ctx.storage.put("events", store);
      await this.ctx.storage.put("rev", rev + 1);
      return rev + 1;
    });
  }

  /** Atomic reset of one event to a clean default bracket. */
  async resetEvent(eventId) {
    return this.ctx.blockConcurrencyWhile(async () => {
      const raw = await this.ctx.storage.get("events");
      const { store } = normalizeStoreForDo(raw);
      const fresh = createDefaultEvent();
      fresh.id = eventId;
      store[eventId] = fresh;
      const rev = (await this.ctx.storage.get("rev")) || 0;
      await this.ctx.storage.put("events", store);
      await this.ctx.storage.put("rev", rev + 1);
      return fresh;
    });
  }

  /** One-time import from legacy KV blob if DO storage is empty. */
  async importFromKvIfEmpty(kvData) {
    return this.ctx.blockConcurrencyWhile(async () => {
      const existing = await this.ctx.storage.get("events");
      if (existing && Object.keys(existing).length > 0) {
        return { imported: false };
      }
      const { store } = normalizeStoreForDo(kvData);
      await this.ctx.storage.put("events", store);
      await this.ctx.storage.put("rev", 1);
      return { imported: true };
    });
  }
}
