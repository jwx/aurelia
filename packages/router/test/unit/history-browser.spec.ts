import { HistoryBrowser } from './../../src/history-browser';
import { expect } from 'chai';

describe('history-browser', () => {
  it('should have some tests', () => {
    var hb = new HistoryBrowser();
    expect(hb).to.be.equal(hb);
  });

  describe('goto', () => {
    it('should have set the path', () => {
      var hb = new HistoryBrowser();
      hb.activate();

      hb.goto('/test/abc', "test title", { data: 'test' });
      expect(hb.currentEntry).to.be.not.null;
      expect(hb.currentEntry.path).to.be.equal('/test/abc');
      hb.goto('/test/def', "second title", { data: 'second' });
      expect(hb.currentEntry.path).to.be.equal('/test/def');
      expect(hb.historyEntries.length).to.be.equal(2);
      hb.back();
      // expect(hb.currentEntry.path).to.be.equal('/test/abc');
      // expect(hb.currentEntry.index).to.be.equal(2);
    });
  });
});
