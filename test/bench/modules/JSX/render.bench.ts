import {bench, describe} from 'vitest';
import {render} from '../../../../lib/modules/JSX/render';

describe('render performance', () => {
  bench('simple static text', () => {
    render('hello world');
  });

  bench('number rendering', () => {
    render(123456);
  });

  bench('single element with props', () => {
    render({
      type: 'div',
      props: {
        className: 'test',
        id: 'main',
        'data-value': '42',
      },
    });
  });

  bench('nested elements', () => {
    render({
      type: 'section',
      props: {
        className: 'wrapper',
        children: [
          {type: 'h1', props: {children: 'Title'}},
          {type: 'p', props: {children: 'Paragraph'}},
          {type: 'footer', props: {children: '©2025'}},
        ],
      },
    });
  });

  bench('void tag element', () => {
    render({
      type: 'br',
      props: {className: 'space'},
    });
  });

  bench('element with style and boolean attributes', () => {
    render({
      type: 'input',
      props: {
        type: 'checkbox',
        checked: true,
        style: {
          display: 'block',
          marginTop: '10px',
        },
      },
    });
  });
});
