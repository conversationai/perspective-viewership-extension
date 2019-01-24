// Copyright 2018 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

const { FuseBox, WebIndexPlugin } = require("fuse-box");
const fuse = FuseBox.init({
    sourceMaps: true,
    homeDir : "src",
    target : 'browser@es6',
    output : "dist/background/$name.js",
    plugins : []
})
fuse.bundle("background").instructions("> background/background.ts");
fuse.run();
