import { html } from "hono/html";

const fileSizeHumanReadable = (size: number) => {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  while (size > 1000) {
    size /= 1000;
    i++;
  }
  return `${size.toFixed(2)} ${units[i]}`;
};

export const Page = ({
  files,
}: {
  files: Array<{ id: string; name: string; fileSize: number }>;
}) => {
  return html`
    <html lang="en">
      <head>
        <title>files</title>
        <script>
          function download(fileName) {
            window.open("/files/" + fileName, "_blank");
          }

          function onClick(e) {
            e.preventDefault();
            console.log(e.target.dataset.fileName);
            download(e.target.dataset.fileName);
          }

          function upload(e) {
            e.preventDefault();

            const file = document.querySelector("input[type=file]").files[0];
            const formData = new FormData();
            formData.set("file", file);
            fetch("/files", {
              method: "POST",
              body: formData,
            }).then(() => {
              window.location.reload();
            });
          }
        </script>
        <style>
          table {
            border-collapse: collapse;
          }
          td,
          th {
            border: 1px gray solid;
          }
        </style>
      </head>
      <body>
        <div>
          <form id="upload-form">
            <input type="file" name="file" />
            <button type="submit">upload</button>
          </form>
        </div>
        <table id="files">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>File size</th>
              <th>Download</th>
            </tr>
          </thead>
          <tbody>
            ${files.length === 0
              ? html`<div>No files, Try to upload</div>`
              : ""}
            ${files.map(
              (file) =>
                html`<tr>
                  <td>${file.id}</td>
                  <td>${file.name}</td>
                  <td>${fileSizeHumanReadable(file.fileSize)}</td>
                  <td>
                    <button
                      class="download-button"
                      data-file-name="${file.name}"
                    >
                      Download
                    </button>
                  </td>
                </tr>`,
            )}
          </tbody>
        </table>
      </body>
      <script>
        document
          .querySelectorAll("button.download-button[data-file-name]")
          .forEach((el) => {
            el.addEventListener("click", onClick);
          });
        document
          .querySelector("#upload-form")
          .addEventListener("submit", upload);
      </script>
    </html>
  `;
};
