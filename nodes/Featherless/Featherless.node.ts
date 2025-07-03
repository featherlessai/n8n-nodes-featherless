import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IDataObject,
	IHttpRequestMethods,
	IHttpRequestOptions,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

interface IFeatherlessResponse extends IDataObject {
	id: string;
	model: string;
	created: number;
	object: string;
	usage: {
		prompt_tokens: number;
		completion_tokens: number;
		total_tokens: number;
	};
	choices: Array<{
		message: {
			role: string;
			content: string;
		};
		finish_reason: string;
		index: number;
	}>;
}

export class Featherless implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Featherless',
		name: 'featherless',
		icon: 'file:featherless.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: 'Interact with Featherless API',
		defaults: {
			name: 'Featherless',
		},
		usableAsTool: true,
		inputs: '={{["main"]}}',
		outputs: '={{["main"]}}',
		credentials: [
			{
				name: 'featherlessApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Chat',
						value: 'chat',
						description: 'Send a chat message',
						action: 'Send a chat message',
					},
				],
				default: 'chat',
			},
			{
				displayName: 'Model Name or ID',
				name: 'model',
				type: 'string',
				required: true,
				default: '',
				description:
					'Enter the model ID you want to use. Visit https://featherless.ai/models to view available models.',
				placeholder: 'meta-llama/Meta-Llama-3.1-8B-Instruct',
			},
			{
				displayName: 'System Prompt',
				name: 'system_prompt',
				type: 'string',
				typeOptions: {
					rows: 4,
				},
				default: '',
				description: 'System message to set the behavior of the assistant',
				placeholder: 'You are a helpful assistant...',
			},
			{
				displayName: 'Message',
				name: 'message',
				type: 'string',
				typeOptions: {
					rows: 4,
				},
				default: '',
				description: 'The message to send to the chat model',
				required: true,
			},
			{
				displayName: 'Temperature',
				name: 'temperature',
				type: 'number',
				default: 0.9,
				description: 'What sampling temperature to use',
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				options: [
					{
						displayName: 'Frequency Penalty',
						name: 'frequency_penalty',
						type: 'number',
						default: 0,
						description:
							'Number between -2.0 and 2.0. Positive values penalize new tokens based on their existing frequency.',
					},
					{
						displayName: 'Max Tokens',
						name: 'max_tokens',
						type: 'number',
						default: 1000,
						description: 'The maximum number of tokens to generate',
					},
					{
						displayName: 'Presence Penalty',
						name: 'presence_penalty',
						type: 'number',
						default: 0,
						description:
							'Number between -2.0 and 2.0. Positive values penalize new tokens based on whether they appear in the text so far.',
					},
					{
						displayName: 'Top P',
						name: 'top_p',
						type: 'number',
						default: 1,
						description: 'An alternative to sampling with temperature, called nucleus sampling',
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		const credentials = await this.getCredentials('featherlessApi');
		if (!credentials?.apiKey) {
			throw new NodeOperationError(this.getNode(), 'No valid API key provided');
		}

		for (let i = 0; i < items.length; i++) {
			try {
				const operation = this.getNodeParameter('operation', i) as string;
				const model = this.getNodeParameter('model', i) as string;
				const systemPrompt = this.getNodeParameter('system_prompt', i, '') as string;
				const message = this.getNodeParameter('message', i) as string;
				const temperature = this.getNodeParameter('temperature', i) as number;
				const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

				if (operation === 'chat') {
					const messages: Array<{ role: string; content: string }> = [];

					// Add system message if provided
					if (systemPrompt) {
						messages.push({
							role: 'system',
							content: systemPrompt,
						});
					}

					// Add user message
					messages.push({
						role: 'user',
						content: message,
					});

					const requestBody = {
						model,
						messages,
						temperature,
						...additionalFields,
					};

					const options: IHttpRequestOptions = {
						url: 'https://api.featherless.ai/v1/chat/completions',
						headers: {
							Authorization: `Bearer ${credentials.apiKey}`,
							'HTTP-Referer': 'https://github.com/featherlessai/n8n-nodes-featherless',
							'X-Title': 'n8n Featherless Node',
							'Content-Type': 'application/json',
						},
						method: 'POST' as IHttpRequestMethods,
						body: requestBody,
						json: true,
					};

					const response = await this.helpers.httpRequestWithAuthentication.call(
						this,
						'featherlessApi',
						options,
					);

					if (!response?.choices?.[0]?.message?.content) {
						throw new NodeOperationError(
							this.getNode(),
							'Invalid response format from Featherless API',
						);
					}

					const typedResponse = response as IFeatherlessResponse;
					const messageContent = typedResponse.choices[0].message.content.trim();

					returnData.push({
						json: {
							response: messageContent,
						},
						pairedItem: { item: i },
					});
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							error: (error as Error).message,
						},
						pairedItem: { item: i },
					});
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}
