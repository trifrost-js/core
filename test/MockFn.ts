type AsyncFunction = (...args: unknown[]) => Promise<unknown>;
type StandardFunction = (...args: unknown[]) => unknown;

type AnyFunction = AsyncFunction | StandardFunction;
type AnyObject = { [key: string]: unknown };

export default class MockFn {
  /* Original function on the parent container */
  #orig_fn: unknown;

  /* Parent container of the function being mocked */
  #mock_par: unknown;

  /* Name of the function being mocked on the parent container */
  #mock_key: string | undefined;

  /* Blueprint for synchronous mock */
  #blueprint_sync = (...args: unknown[]) => {
    this.calls.push(args);
    if (this.reject) throw new Error("Oh No");
    if (this.spy) {
      this.spyreturn = (this.#orig_fn as StandardFunction)(...args);
      return this.spyreturn;
    }
    return typeof this.return === "function"
      ? this.return(...args)
      : this.return;
  };

  /* Blueprint for asynchronous mock */
  #blueprint_async = async (...args: unknown[]) => {
    this.calls.push(args);
    if (this.reject) throw new Error("Oh No");
    if (this.spy) {
      this.spyreturn = await (this.#orig_fn as AsyncFunction)(...args);
      return this.spyreturn;
    }
    return typeof this.return === "function"
      ? this.return(...args)
      : this.return;
  };

  /* Array of calls to the mocked function */
  calls: unknown[] = [];

  /* Configured return when the mocked function gets called */
  return: unknown = false;

  /* Whether or not the mock should reject the call (for use in async mocks) */
  reject: boolean = false;

  /* Whether or not we're just spying */
  spy: boolean = false;

  /* Returned from the spied function */
  spyreturn: unknown = undefined;

  get isEmpty () {
    return this.calls.length === 0;
  }

  /**
   * Reset the current mock for a next test
   */
  reset() {
    this.return = false;
    this.reject = false;
    this.spy = false;
    this.spyreturn = undefined;
    this.calls = [];
  }

  /**
   * Mock a function on the provided parent
   *
   * @param {object/class} par - Object or class that contains the method we want to mock
   * @param {string} key - Name of the method we want to mock
   */
  mock(parent: unknown, key: string) {
    this.#mock_par = parent as { [key: string]: unknown };
    this.#mock_key = key;

    this.#orig_fn = (this.#mock_par as AnyObject)[key] as AnyFunction;

    /* Override parent key with mock */
    (this.#mock_par as AnyObject)[key] =
      (this.#orig_fn as AnyFunction).constructor.name === "AsyncFunction"
        ? this.#blueprint_async
        : this.#blueprint_sync;

    /* Ensure state is reset if mocking a new function */
    this.reset();
  }

  /**
   * Restore the mocked function to its original state
   */
  restore() {
    (this.#mock_par as AnyObject)[this.#mock_key as string] = this.#orig_fn;
  }
}

