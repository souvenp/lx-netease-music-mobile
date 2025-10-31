import DownloadTask = LX.Download.DownloadTask;

export interface InitState {
  tasks: DownloadTask[];
}

const state: InitState = {
  tasks: [],
};

export default state;
