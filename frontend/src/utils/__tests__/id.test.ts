import { generateMessageId, generateCorrelationId } from '../id';

describe('ID generation utilities', () => {
  describe('generateMessageId', () => {
    it('should generate unique message IDs', () => {
      const id1 = generateMessageId();
      const id2 = generateMessageId();

      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^msg_\d+_[a-z0-9]+$/);
      expect(id2).toMatch(/^msg_\d+_[a-z0-9]+$/);
    });

    it('should start with msg_ prefix', () => {
      const id = generateMessageId();
      expect(id).toMatch(/^msg_/);
    });
  });

  describe('generateCorrelationId', () => {
    it('should generate unique correlation IDs', () => {
      const id1 = generateCorrelationId();
      const id2 = generateCorrelationId();

      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^corr_\d+_[a-z0-9]+$/);
      expect(id2).toMatch(/^corr_\d+_[a-z0-9]+$/);
    });

    it('should start with corr_ prefix', () => {
      const id = generateCorrelationId();
      expect(id).toMatch(/^corr_/);
    });
  });
});
