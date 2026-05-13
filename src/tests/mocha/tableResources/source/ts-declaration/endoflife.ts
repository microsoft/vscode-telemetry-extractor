import { publicLog2 } from '../lib/publicLog';

export type InlineCompletionEndOfLifeEvent = {
	// request
	languageId: string;
	extensionId: string;
	groupId: string | undefined;
	// behavior
	shown: boolean;
	timeUntilShown: number | undefined;
	timeUntilProviderRequest: number | undefined;
	timeUntilProviderResponse: number | undefined;
	reason: 'accepted' | 'rejected' | 'ignored' | undefined;
	preceeded: boolean | undefined;
};

type InlineCompletionsEndOfLifeClassification = {
	owner: 'benibenj';
	comment: 'Inline completions ended. @sentToGitHub';
	$tableInfo: { name: 'monacoworkbench_inlinecompletion.endoflife'; commonProperties: 'standard'; backfill: false };
	extensionId: { classification: 'SystemMetaData'; purpose: 'FeatureInsight'; comment: 'The identifier for the extension that contributed the inline completion'; type: 'string' };
	groupId: { classification: 'SystemMetaData'; purpose: 'FeatureInsight'; comment: 'The group ID of the extension that contributed the inline completion'; type: 'string' };
	shown: { classification: 'SystemMetaData'; purpose: 'FeatureInsight'; comment: 'Whether the inline completion was shown to the user'; column: { name: 'isShown'; type: 'bool' } };
	timeUntilShown: { classification: 'SystemMetaData'; purpose: 'FeatureInsight'; comment: 'The time it took for the inline completion to be shown after the request'; type: 'int' };
	timeUntilProviderRequest: { classification: 'SystemMetaData'; purpose: 'FeatureInsight'; comment: 'The time it took for the inline completion to be requested from the provider'; type: 'int' };
	timeUntilProviderResponse: { classification: 'SystemMetaData'; purpose: 'FeatureInsight'; comment: 'The time it took for the inline completion to be shown after the request'; type: 'int' };
	reason: { classification: 'SystemMetaData'; purpose: 'FeatureInsight'; comment: 'The reason for the inline completion ending'; type: 'string' };
	preceeded: { classification: 'SystemMetaData'; purpose: 'FeatureInsight'; comment: 'Whether the inline completion was preceeded by another one'; column: { name: 'isPreceded'; type: 'bool' } };
	languageId: { classification: 'SystemMetaData'; purpose: 'FeatureInsight'; comment: 'The language ID of the document where the inline completion was shown'; type: 'string' };
};

const sentEvent: InlineCompletionEndOfLifeEvent = {
	languageId: 'typescript',
	extensionId: 'my-extension',
	groupId: 'my-group',
	shown: true,
	timeUntilShown: 100,
	timeUntilProviderRequest: 50,
	timeUntilProviderResponse: 150,
	reason: 'accepted',
	preceeded: false
};

publicLog2<InlineCompletionEndOfLifeEvent, InlineCompletionsEndOfLifeClassification>('Event1', sentEvent);