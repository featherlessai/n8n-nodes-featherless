import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class FeatherlessApi implements ICredentialType {
	name = 'featherlessApi';
	displayName = 'Featherless API';
	documentationUrl = 'https://featherless.ai/docs/quickstart-guide';
	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			required: true,
			description: 'The Featherless API key',
		},
	];
}