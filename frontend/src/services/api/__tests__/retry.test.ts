import { submitReviewWithRetry } from '../retry';
import { submitReview } from '../client';
import { ApiError } from '../../../types';

jest.mock('../client');

const mockSubmitReview = submitReview as jest.MockedFunction<typeof submitReview>;

describe('submitReviewWithRetry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return stream on first successful attempt', async () => {
    const mockStream = new ReadableStream();
    mockSubmitReview.mockResolvedValueOnce(mockStream);

    const result = await submitReviewWithRetry('test doc');

    expect(result).toBe(mockStream);
    expect(mockSubmitReview).toHaveBeenCalledTimes(1);
  });

  it('should retry on network error and succeed', async () => {
    const mockStream = new ReadableStream();
    mockSubmitReview
      .mockRejectedValueOnce(new ApiError('Network error'))
      .mockResolvedValueOnce(mockStream);

    const result = await submitReviewWithRetry('test doc', {}, { maxAttempts: 3, delayMs: 10 });

    expect(result).toBe(mockStream);
    expect(mockSubmitReview).toHaveBeenCalledTimes(2);
  });

  it('should not retry on 4xx client errors', async () => {
    const clientError = new ApiError('Bad request', 400);
    mockSubmitReview.mockRejectedValueOnce(clientError);

    await expect(submitReviewWithRetry('test doc')).rejects.toThrow('Bad request');

    expect(mockSubmitReview).toHaveBeenCalledTimes(1);
  });

  it('should not retry on AbortError', async () => {
    const abortError = new Error('Request cancelled');
    abortError.name = 'AbortError';
    mockSubmitReview.mockRejectedValueOnce(abortError);

    await expect(submitReviewWithRetry('test doc')).rejects.toThrow('Request cancelled');

    expect(mockSubmitReview).toHaveBeenCalledTimes(1);
  });

  it('should throw after max retry attempts', async () => {
    const networkError = new ApiError('Network error');
    mockSubmitReview.mockRejectedValue(networkError);

    await expect(
      submitReviewWithRetry('test doc', {}, { maxAttempts: 2, delayMs: 10 })
    ).rejects.toThrow('Network error');

    expect(mockSubmitReview).toHaveBeenCalledTimes(2);
  });
});
