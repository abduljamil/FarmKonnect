const BaseRepository = require('../dal/base');

/** Chainable mongoose Query double — every builder call returns `this`. */
const mockQuery = (result) => {
  const query = {};
  query.select = jest.fn().mockReturnValue(query);
  query.populate = jest.fn().mockReturnValue(query);
  query.sort = jest.fn().mockReturnValue(query);
  query.limit = jest.fn().mockReturnValue(query);
  query.skip = jest.fn().mockReturnValue(query);
  query.exec = jest.fn().mockResolvedValue(result);
  return query;
};

const mockModel = () => ({
  findById: jest.fn(),
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findByIdAndDelete: jest.fn(),
  countDocuments: jest.fn(),
  exists: jest.fn(),
});

describe('BaseRepository.findById', () => {
  it('applies select and populate options to the query', async () => {
    const model = mockModel();
    const query = mockQuery({ _id: '1' });
    model.findById.mockReturnValue(query);
    const repo = new BaseRepository(model);

    await repo.findById('1', { select: 'name email', populate: 'seller' });

    expect(query.select).toHaveBeenCalledWith('name email');
    expect(query.populate).toHaveBeenCalledWith('seller');
  });

  it('skips the builders when no options are given', async () => {
    const model = mockModel();
    const query = mockQuery(null);
    model.findById.mockReturnValue(query);

    await new BaseRepository(model).findById('1');

    expect(query.select).not.toHaveBeenCalled();
    expect(query.populate).not.toHaveBeenCalled();
  });

  it('wraps a driver error in a descriptive message', async () => {
    const model = mockModel();
    model.findById.mockImplementation(() => {
      throw new Error('connection lost');
    });

    await expect(new BaseRepository(model).findById('1'))
      .rejects.toThrow('Error finding document by ID: connection lost');
  });
});

describe('BaseRepository.updateById', () => {
  it('wraps updates in $set and returns the updated document by default', async () => {
    const model = mockModel();
    model.findByIdAndUpdate.mockResolvedValue({ _id: '1', name: 'new' });

    await new BaseRepository(model).updateById('1', { name: 'new' });

    expect(model.findByIdAndUpdate).toHaveBeenCalledWith(
      '1',
      { $set: { name: 'new' } },
      expect.objectContaining({ new: true, runValidators: true })
    );
  });

  it('lets caller options override the defaults', async () => {
    const model = mockModel();
    model.findByIdAndUpdate.mockResolvedValue({});

    await new BaseRepository(model).updateById('1', { name: 'x' }, { runValidators: false });

    expect(model.findByIdAndUpdate).toHaveBeenCalledWith(
      '1',
      expect.anything(),
      expect.objectContaining({ runValidators: false })
    );
  });
});

describe('BaseRepository.exists', () => {
  it('coerces a found document to true', async () => {
    const model = mockModel();
    model.exists.mockResolvedValue({ _id: '1' });

    await expect(new BaseRepository(model).exists({ email: 'a@b.c' })).resolves.toBe(true);
  });

  it('coerces null to false', async () => {
    const model = mockModel();
    model.exists.mockResolvedValue(null);

    await expect(new BaseRepository(model).exists({ email: 'a@b.c' })).resolves.toBe(false);
  });
});

describe('BaseRepository.paginate', () => {
  /** Wires find/count so paginate resolves against a known total. */
  const repoWith = (rows, total) => {
    const model = mockModel();
    const query = mockQuery(rows);
    model.find.mockReturnValue(query);
    model.countDocuments.mockResolvedValue(total);
    return { repo: new BaseRepository(model), query };
  };

  it('translates page and limit into a skip', async () => {
    const { repo, query } = repoWith([], 100);

    await repo.paginate({}, 3, 10);

    expect(query.skip).toHaveBeenCalledWith(20);
    expect(query.limit).toHaveBeenCalledWith(10);
  });

  it('omits the skip builder entirely on the first page', async () => {
    // find() guards with `if (options.skip)`, so an offset of 0 never reaches
    // the query. Harmless — skip(0) is a no-op — but worth pinning down.
    const { repo, query } = repoWith([], 100);

    await repo.paginate({}, 1, 10);

    expect(query.skip).not.toHaveBeenCalled();
  });

  it('rounds the page count up on a partial last page', async () => {
    const { repo } = repoWith([], 95);

    const { pagination } = await repo.paginate({}, 1, 10);

    expect(pagination.pages).toBe(10);
  });

  it('flags hasNext but not hasPrev on the first page', async () => {
    const { repo } = repoWith([], 50);

    const { pagination } = await repo.paginate({}, 1, 10);

    expect(pagination).toMatchObject({ hasNext: true, hasPrev: false });
  });

  it('flags hasPrev but not hasNext on the last page', async () => {
    const { repo } = repoWith([], 50);

    const { pagination } = await repo.paginate({}, 5, 10);

    expect(pagination).toMatchObject({ hasNext: false, hasPrev: true });
  });

  it('reports neither direction when everything fits on one page', async () => {
    const { repo } = repoWith([], 4);

    const { pagination } = await repo.paginate({}, 1, 10);

    expect(pagination).toMatchObject({ pages: 1, hasNext: false, hasPrev: false });
  });

  it('handles an empty result set without dividing by zero', async () => {
    const { repo } = repoWith([], 0);

    const { data, pagination } = await repo.paginate({}, 1, 10);

    expect(data).toEqual([]);
    expect(pagination).toMatchObject({ total: 0, pages: 0, hasNext: false, hasPrev: false });
  });

  it('defaults to page 1 with a limit of 10', async () => {
    const { repo, query } = repoWith([], 30);

    const { pagination } = await repo.paginate();

    expect(query.limit).toHaveBeenCalledWith(10);
    expect(pagination).toMatchObject({ page: 1, limit: 10, pages: 3 });
  });
});
