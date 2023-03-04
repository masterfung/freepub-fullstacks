import ImageLabeler from "./labeling";
import Moderation from "./moderation";

interface Content {
  title: string;
  description: string;
  author: string;
  directoryCID: string;
  fileNames: string[];
}

const maxArtifactLimit = 10;

enum ModerationStatus {
  NotStarted,
  NeedsReview,
  Passed,
}

export default class ContentCheck {
  private labeler = new ImageLabeler();
  private moderation = new Moderation();
  private ipfsAddress = "https://ipfs.io/ipfs/";

  moderate = async (content: Content) => {
    const labelSet = new Set<string>();
    let status = ModerationStatus.NotStarted;

    const filteredFiles = content.fileNames.filter((file) => {
      const ext = file.split(".").pop() ?? "";
      return !["png", "jpg", "jpeg", "gif", "bmp", "svg"].includes(
        ext.toLowerCase()
      );
    });

    //todo double check if the link in here makes sense
    const labelingRes = await Promise.all(
      filteredFiles
        .slice(0, maxArtifactLimit)
        .map((img) =>
          this.labeler.getLabelsUrl(
            `${this.ipfsAddress}${content.directoryCID}/${img}`
          )
        )
    );

    if (filteredFiles.length > 0 && labelingRes.every((res) => !res.success))
      return status;

    labelingRes
      .flatMap((res) => res.labels)
      .forEach((lbl) => labelSet.add(lbl));

    const moderationRes = await this.moderation.verify(
      content.title,
      content.description,
      Array.from(labelSet)
    );

    if (moderationRes.success) {
      if (moderationRes.confidence >= 0.5) status = ModerationStatus.Passed;
      else status = ModerationStatus.NeedsReview;
    }

    return status;
  };
}