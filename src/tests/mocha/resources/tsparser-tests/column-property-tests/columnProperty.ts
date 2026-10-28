import { publicLog2 } from '../publicLog';

type ColumnPropertyClassification = {
    $tableInfo: { name: 'errors'; commonProperties: 'standard'; backfill: false };
    line: { classification: 'CallstackOrException'; purpose: 'PerformanceAndHealth'; comment: 'The line of the error.' };
    column: { classification: 'CallstackOrException'; purpose: 'PerformanceAndHealth'; comment: 'The column of the error.' };
    file: { classification: 'CallstackOrException'; purpose: 'PerformanceAndHealth'; comment: 'The file of the error.'; column: { name: 'File'; type: 'string' } };
};

type ColumnPropertyEvent = {
    line: number;
    column: number;
    file: string;
};

publicLog2<ColumnPropertyEvent, ColumnPropertyClassification>('ColumnPropertyEvent', { line: 1, column: 2, file: '' });
