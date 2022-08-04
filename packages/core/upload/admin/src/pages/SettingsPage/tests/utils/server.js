import { setupServer } from 'msw/node';
import { rest } from 'msw';

const handlers = [
  rest.get('*/settings', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        data: {
          autoOrientation: true,
          responsiveDimensions: true,
          sizeOptimization: false,
          sizeOptimizationQuality: 90,
        },
      })
    );
  }),
];

const server = setupServer(...handlers);

export default server;
