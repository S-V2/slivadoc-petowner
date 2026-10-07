import assert from "node:assert/strict";
import test from "node:test";
import {petHubPhotos,petHubVideoPoster} from "../app/lib/pethub-media.ts";
test("gallery uses API album even when legacy cover is empty",()=>{assert.deepEqual(petHubPhotos({media_url:"",media_urls:["https://cdn.test/a.jpg","https://cdn.test/b.jpg"]}),["https://cdn.test/a.jpg","https://cdn.test/b.jpg"]);});
test("gallery deduplicates legacy cover and drops invalid URLs",()=>{assert.deepEqual(petHubPhotos({media_url:"https://cdn.test/a.jpg",media_urls:["https://cdn.test/a.jpg","", "javascript:invalid"]}),["https://cdn.test/a.jpg"]);});
test("video story uses a Cloudinary poster instead of rendering mp4 as image",()=>{assert.equal(petHubVideoPoster("https://res.cloudinary.com/demo/video/upload/dog.mp4"),"https://res.cloudinary.com/demo/video/upload/so_0,w_720,h_960,c_fill/dog.jpg");assert.equal(petHubVideoPoster("https://video.test/dog.mp4"),"");});
