import moment from 'moment';

import {
  decodePanelOptionsFromQueryString,
  encodePanelOptionsToQueryString,
  escapeHTML,
  formatDuration,
  formatTime,
  formatRelative,
  humanizeDuration,
  metricToSeriesName,
  now,
  parseDuration,
  parseOption,
  parseTime,
  toQueryString,
} from '.';
import { PanelType } from '../pages/graph/Panel';

describe('Utils', () => {
  describe('escapeHTML', (): void => {
    it('escapes html sequences', () => {
      expect(escapeHTML(`<strong>'example'&"another/example"</strong>`)).toEqual(
        '&lt;strong&gt;&#39;example&#39;&amp;&quot;another&#x2F;example&quot;&lt;&#x2F;strong&gt;'
      );
    });
  });

  describe('metricToSeriesName', () => {
    it('returns "{}" if labels is empty', () => {
      const labels = {};
      expect(metricToSeriesName(labels)).toEqual('{}');
    });
    it('returns "metric_name{}" if labels only contains __name__', () => {
      const labels = { __name__: 'metric_name' };
      expect(metricToSeriesName(labels)).toEqual('metric_name{}');
    });
    it('returns "{label1=value_1, ..., labeln=value_n} if there are many labels and no name', () => {
      const labels = { label1: 'value_1', label2: 'value_2', label3: 'value_3' };
      expect(metricToSeriesName(labels)).toEqual('{label1="value_1", label2="value_2", label3="value_3"}');
    });
    it('returns "metric_name{label1=value_1, ... ,labeln=value_n}" if there are many labels and a name', () => {
      const labels = {
        __name__: 'metric_name',
        label1: 'value_1',
        label2: 'value_2',
        label3: 'value_3',
      };
      expect(metricToSeriesName(labels)).toEqual('metric_name{label1="value_1", label2="value_2", label3="value_3"}');
    });
  });

  describe('Time format', () => {
    describe('formatTime', () => {
      it('returns a time string representing the time in seconds', () => {
        expect(formatTime(1572049380000)).toEqual('2019-10-26 00:23:00');
        expect(formatTime(0)).toEqual('1970-01-01 00:00:00');
      });
    });

    describe('parseTime', () => {
      it('returns a time string representing the time in seconds', () => {
        expect(parseTime('2019-10-26 00:23')).toEqual(1572049380000);
        expect(parseTime('1970-01-01 00:00')).toEqual(0);
        expect(parseTime('0001-01-01T00:00:00Z')).toEqual(-62135596800000);
      });
    });

    describe('parseDuration and formatDuration', () => {
      describe('should parse and format durations correctly', () => {
        const tests: { input: string; output: number; expectedString?: string }[] = [
          {
            input: '0',
            output: 0,
            expectedString: '0s',
          },
          {
            input: '0w',
            output: 0,
            expectedString: '0s',
          },
          {
            input: '0s',
            output: 0,
          },
          {
            input: '324ms',
            output: 324,
          },
          {
            input: '3s',
            output: 3 * 1000,
          },
          {
            input: '5m',
            output: 5 * 60 * 1000,
          },
          {
            input: '1h',
            output: 60 * 60 * 1000,
          },
          {
            input: '4d',
            output: 4 * 24 * 60 * 60 * 1000,
          },
          {
            input: '4d1h',
            output: 4 * 24 * 60 * 60 * 1000 + 1 * 60 * 60 * 1000,
          },
          {
            input: '14d',
            output: 14 * 24 * 60 * 60 * 1000,
            expectedString: '2w',
          },
          {
            input: '3w',
            output: 3 * 7 * 24 * 60 * 60 * 1000,
          },
          {
            input: '3w2d1h',
            output: 3 * 7 * 24 * 60 * 60 * 1000 + 2 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000,
            expectedString: '23d1h',
          },
          {
            input: '1y2w3d4h5m6s7ms',
            output:
              1 * 365 * 24 * 60 * 60 * 1000 +
              2 * 7 * 24 * 60 * 60 * 1000 +
              3 * 24 * 60 * 60 * 1000 +
              4 * 60 * 60 * 1000 +
              5 * 60 * 1000 +
              6 * 1000 +
              7,
            expectedString: '382d4h5m6s7ms',
          },
        ];

        tests.forEach((t) => {
          it(t.input, () => {
            const d = parseDuration(t.input);
            expect(d).toEqual(t.output);
            expect(formatDuration(d!)).toEqual(t.expectedString || t.input);
          });
        });
      });

      describe('should fail to parse invalid durations', () => {
        const tests = ['1', '1y1m1d', '-1w', '1.5d', 'd', ''];

        tests.forEach((t) => {
          it(t, () => {
            expect(parseDuration(t)).toBe(null);
          });
        });
      });
    });

    describe('humanizeDuration', () => {
      it('humanizes zero', () => {
        expect(humanizeDuration(0)).toEqual('0s');
      });
      it('humanizes milliseconds', () => {
        expect(humanizeDuration(1.234567)).toEqual('1.235ms');
        expect(humanizeDuration(12.34567)).toEqual('12.346ms');
        expect(humanizeDuration(123.45678)).toEqual('123.457ms');
        expect(humanizeDuration(123)).toEqual('123.000ms');
      });
      it('humanizes seconds', () => {
        expect(humanizeDuration(12340)).toEqual('12.340s');
      });
      it('humanizes minutes', () => {
        expect(humanizeDuration(1234567)).toEqual('20m 34s');
      });

      it('humanizes hours', () => {
        expect(humanizeDuration(12345678)).toEqual('3h 25m 45s');
      });

      it('humanizes days', () => {
        expect(humanizeDuration(123456789)).toEqual('1d 10h 17m 36s');
        expect(humanizeDuration(123456789000)).toEqual('1428d 21h 33m 9s');
      });
      it('takes sign into account', () => {
        expect(humanizeDuration(-123456789000)).toEqual('-1428d 21h 33m 9s');
      });
    });

    describe('formatRelative', () => {
      it('renders never for pre-beginning-of-time strings', () => {
        expect(formatRelative('0001-01-01T00:00:00Z', now())).toEqual('Never');
      });
      it('renders a humanized duration for sane durations', () => {
        expect(formatRelative('2019-11-04T09:15:29.578701-07:00', parseTime('2019-11-04T09:15:35.8701-07:00'))).toEqual(
          '6.292s'
        );
        expect(formatRelative('2019-11-04T09:15:35.8701-07:00', parseTime('2019-11-04T09:15:29.578701-07:00'))).toEqual(
          '-6.292s'
        );
      });
    });
  });

  describe('URL Params', () => {
    const stores: any = [
      {
        name: 'thanos_sidecar_one:10901',
        lastCheck: '2020-09-20T11:35:18.250713478Z',
        lastError: null,
        labelSets: [
          {
            labels: [
              {
                name: 'monitor',
                value: 'prometheus_one',
              },
            ],
          },
        ],
        minTime: 1600598100000,
        maxTime: 9223372036854776000,
      },
    ];

    const panels: any = [
      {
        key: '0',
        options: {
          endTime: 1572046620000,
          expr: 'rate(node_cpu_seconds_total{mode="system"}[1m])',
          range: 60 * 60 * 1000,
          resolution: null,
          stacked: false,
          maxSourceResolution: 'raw',
          useDeduplication: true,
          usePartialResponse: false,
          type: PanelType.Graph,
          storeMatches: [],
          engine: 'prometheus',
        },
      },
      {
        key: '1',
        options: {
          endTime: null,
          expr: 'node_filesystem_avail_bytes',
          range: 60 * 60 * 1000,
          resolution: null,
          stacked: false,
          maxSourceResolution: 'auto',
          useDeduplication: false,
          usePartialResponse: true,
          type: PanelType.Table,
          storeMatches: stores,
          engine: 'prometheus',
        },
      },
    ];
    const query =
      '?g0.expr=rate(node_cpu_seconds_total%7Bmode%3D%22system%22%7D%5B1m%5D)&g0.tab=0&g0.stacked=0&g0.range_input=1h&g0.max_source_resolution=raw&g0.deduplicate=1&g0.partial_response=0&g0.store_matches=%5B%5D&g0.engine=prometheus&g0.end_input=2019-10-25%2023%3A37%3A00&g0.moment_input=2019-10-25%2023%3A37%3A00&g1.expr=node_filesystem_avail_bytes&g1.tab=1&g1.stacked=0&g1.range_input=1h&g1.max_source_resolution=auto&g1.deduplicate=0&g1.partial_response=1&g1.store_matches=%5B%7B%22name%22%3A%22thanos_sidecar_one%3A10901%22%2C%22lastCheck%22%3A%222020-09-20T11%3A35%3A18.250713478Z%22%2C%22lastError%22%3Anull%2C%22labelSets%22%3A%5B%7B%22labels%22%3A%5B%7B%22name%22%3A%22monitor%22%2C%22value%22%3A%22prometheus_one%22%7D%5D%7D%5D%2C%22minTime%22%3A1600598100000%2C%22maxTime%22%3A9223372036854776000%7D%5D&g1.engine=prometheus';

    describe('decodePanelOptionsFromQueryString', () => {
      it('returns [] when query is empty', () => {
        expect(decodePanelOptionsFromQueryString('')).toEqual([]);
      });
      it('returns and array of parsed params when query string is non-empty', () => {
        expect(decodePanelOptionsFromQueryString(query)).toMatchObject(panels);
      });
    });

    describe('parseOption', () => {
      it('should return empty object for invalid param', () => {
        expect(parseOption('invalid_prop=foo')).toEqual({});
      });
      it('should parse expr param', () => {
        expect(parseOption('expr=foo')).toEqual({ expr: 'foo' });
      });
      it('should parse stacked', () => {
        expect(parseOption('stacked=1')).toEqual({ stacked: true });
      });
      it('should parse end_input', () => {
        expect(parseOption('end_input=2019-10-25%2023%3A37')).toEqual({ endTime: moment.utc('2019-10-25 23:37').valueOf() });
      });
      it('should parse moment_input', () => {
        expect(parseOption('moment_input=2019-10-25%2023%3A37')).toEqual({
          endTime: moment.utc('2019-10-25 23:37').valueOf(),
        });
      });

      it('should parse max source res', () => {
        expect(parseOption('max_source_resolution=auto')).toEqual({ maxSourceResolution: 'auto' });
      });
      it('should parse use deduplicate', () => {
        expect(parseOption('deduplicate=1')).toEqual({ useDeduplication: true });
      });
      it('should parse partial_response', () => {
        expect(parseOption('partial_response=1')).toEqual({ usePartialResponse: true });
      });
      it('it should parse store_matches', () => {
        expect(
          parseOption(
            'store_matches=%5B%7B%22name%22%3A%22thanos_sidecar_one%3A10901%22%2C%22lastCheck%22%3A%222020-09-20T11%3A35%3A18.250713478Z%22%2C%22lastError%22%3Anull%2C%22labelSets%22%3A%5B%7B%22labels%22%3A%5B%7B%22name%22%3A%22monitor%22%2C%22value%22%3A%22prometheus_one%22%7D%5D%7D%5D%2C%22minTime%22%3A1600598100000%2C%22maxTime%22%3A9223372036854776000%7D%5D'
          )
        ).toEqual({ storeMatches: stores });
      });

      describe('step_input', () => {
        it('should return step_input parsed if > 0', () => {
          expect(parseOption('step_input=2')).toEqual({ resolution: 2 });
        });
        it('should return empty object if step is equal 0', () => {
          expect(parseOption('step_input=0')).toEqual({});
        });
      });

      describe('range_input', () => {
        it('should return range parsed if its not null', () => {
          expect(parseOption('range_input=2h')).toEqual({ range: 2 * 60 * 60 * 1000 });
        });
        it('should return empty object for invalid value', () => {
          expect(parseOption('range_input=h')).toEqual({});
        });
      });

      describe('Parse type param', () => {
        it('should return panel type "graph" if tab=0', () => {
          expect(parseOption('tab=0')).toEqual({ type: PanelType.Graph });
        });
        it('should return panel type "table" if tab=1', () => {
          expect(parseOption('tab=1')).toEqual({ type: PanelType.Table });
        });
      });
    });

    describe('toQueryString', () => {
      it('should generate query string from panel options', () => {
        expect(
          toQueryString({
            id: 'asdf',
            key: '0',
            options: {
              expr: 'foo',
              type: PanelType.Graph,
              stacked: true,
              range: 0,
              endTime: null,
              resolution: 1,
              maxSourceResolution: 'raw',
              useDeduplication: true,
              usePartialResponse: false,
              storeMatches: [],
              engine: 'prometheus',
            },
          })
        ).toEqual(
          'g0.expr=foo&g0.tab=0&g0.stacked=1&g0.range_input=0s&g0.max_source_resolution=raw&g0.deduplicate=1&g0.partial_response=0&g0.store_matches=%5B%5D&g0.engine=prometheus&g0.step_input=1'
        );
      });
    });

    describe('encodePanelOptionsToQueryString', () => {
      it('returns ? when panels is empty', () => {
        expect(encodePanelOptionsToQueryString([])).toEqual('?');
      });
      it('returns an encoded query string otherwise', () => {
        expect(encodePanelOptionsToQueryString(panels)).toEqual(query);
      });
    });
  });
});
