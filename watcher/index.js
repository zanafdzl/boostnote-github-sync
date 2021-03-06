const { Constants } = require('@dpjayasekara/tscore');
const LocalWatcher = require('./local-watcher');

module.exports = class Watcher {
    /**
     * Construct a Watcher object
     * @param {Map} container
     * @param {Logger} logger
     * @param {Object} config
     */
    constructor({ container, logger, config }) {
        this.container = container;
        this.logger = logger;
        this.config = config;
        this.watch = this.watch.bind(this);

        this.sync = this.container.module('sync');
        this.localWatcher = new LocalWatcher({ container, logger, config });

        this.container.on(Constants.EVENT.APPLICATION_START, this.watch);
    }

    /**
     * Start watcher process
     * @returns {void}
     */
    watch() {
        if (this.config.enumerateOnStartup) {
            // Sweep through all notes in the sync directories and emit change events for all notes to trigger sync
            Promise
                .all(this.config.localDirs.map(async (dir) => {
                    await this.localWatcher.enumerateDirectory(dir, (event, filename) => {
                        this.sync.enqueueSyncItem(event, filename);
                    });
                }))
                .then(() => {
                    this.logger.info('Enumeration complete.');
                })
                .catch((err) => {
                    this.logger.error('Enumeration failed!', err);
                });
        }

        if (this.config.enabled) {
            this.localWatcher
                .start((event, filename) => {
                    this.sync.enqueueSyncItem(event, filename);
                })
                .then(() => {
                    this.logger.info('Watcher started');
                })
                .catch((err) => {
                    this.logger.error('Error occurred while watching', err);
                });
        } else {
            this.logger.info('Watcher is disabled by configuration');
        }
    }
};
