import axios from 'axios';
import { CodeExecutionRequest, CodeExecutionResponse } from '../types';
import { getApiEndpoint } from '../config/aws';

const API_BASE_URL = getApiEndpoint();

export const executeCode = async (request: CodeExecutionRequest): Promise<CodeExecutionResponse> => {
  try {
    const response = await axios.post(`${API_BASE_URL}/execute`, request, {
      timeout: 60000, // 60 seconds timeout for code execution
      headers: {
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  } catch (error: unknown) {
    if (axios.isAxiosError(error) && error.response) {
      return error.response.data;
    }
    if (error instanceof Error) {
      throw new Error(`Network error: ${error.message}`);
    }
    throw new Error('Unknown network error occurred');
  }
};