import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({
  // 쿼리 체인의 종단(thenable)에서 해석되는 결과.
  result: { data: null as unknown, error: null as unknown, count: null as unknown },
  insert: vi.fn(),
  rpc: vi.fn(),
  upload: vi.fn(),
  getPublicUrl: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => {
  // .select().eq().order().limit() / .not() / .in() / .maybeSingle() / .single() 등
  // 어떤 순서로 체이닝해도 마지막에 await 하면 h.result 를 돌려주는 thenable 빌더.
  const makeBuilder = (): Record<string, unknown> => {
    const builder: Record<string, unknown> = {};
    const chain = () => builder;
    builder.select = chain;
    builder.eq = chain;
    builder.in = chain;
    builder.not = chain;
    builder.order = chain;
    builder.limit = chain;
    builder.update = chain;
    builder.delete = chain;
    builder.maybeSingle = () => Promise.resolve(h.result);
    builder.single = () => Promise.resolve(h.result);
    builder.insert = (...a: unknown[]) => h.insert(...a);
    // await builder → h.result
    builder.then = (resolve: (v: unknown) => unknown) => resolve(h.result);
    return builder;
  };
  return {
    supabase: {
      from: () => makeBuilder(),
      rpc: (...a: unknown[]) => h.rpc(...a),
      storage: {
        from: () => ({
          upload: (...a: unknown[]) => h.upload(...a),
          getPublicUrl: (...a: unknown[]) => h.getPublicUrl(...a),
        }),
      },
    },
  };
});

import {
  fetchCommunityPosts,
  fetchBookmarkedPosts,
  fetchCommunityPost,
  fetchCommunityPostForEdit,
  incrementPostViews,
  createCommunityPost,
  updateCommunityPost,
  deleteCommunityPost,
  linkCommunityPostPlaces,
  fetchCommunityComments,
  createCommunityComment,
  deleteCommunityComment,
  updateCommunityComment,
  fetchPostLikesCount,
  fetchPostLiked,
  addPostLike,
  removePostLike,
  uploadCommunityImages,
} from "./community";

beforeEach(() => {
  h.result.data = null;
  h.result.error = null;
  h.result.count = null;
  h.insert.mockReset();
  h.rpc.mockReset();
  h.upload.mockReset();
  h.getPublicUrl.mockReset();
  // insert 는 .select().single() 으로 더 체이닝될 수도, 바로 await 될 수도 있다.
  h.insert.mockReturnValue({
    select: () => ({ single: () => Promise.resolve(h.result) }),
    then: (resolve: (v: unknown) => unknown) => resolve(h.result),
  });
  h.rpc.mockResolvedValue({ error: null });
  h.upload.mockResolvedValue({ error: null });
  h.getPublicUrl.mockReturnValue({ data: { publicUrl: "https://pub/x" } });
});

describe("fetchCommunityPosts", () => {
  it("행 반환(차단 없음)", async () => {
    h.result.data = [{ id: "1" }];
    expect(await fetchCommunityPosts([])).toEqual([{ id: "1" }]);
  });
  it("차단 id 가 있어도 행 반환", async () => {
    h.result.data = [{ id: "2" }];
    expect(await fetchCommunityPosts(["u9"])).toEqual([{ id: "2" }]);
  });
  it("data null 이면 빈 배열", async () => {
    h.result.data = null;
    expect(await fetchCommunityPosts([])).toEqual([]);
  });
  it("에러 시 throw", async () => {
    h.result.error = new Error("posts");
    await expect(fetchCommunityPosts([])).rejects.toThrow("posts");
  });
});

describe("fetchBookmarkedPosts", () => {
  it("빈 id 면 쿼리 없이 빈 배열", async () => {
    expect(await fetchBookmarkedPosts([])).toEqual([]);
  });
  it("행 반환", async () => {
    h.result.data = [{ id: "b1" }];
    expect(await fetchBookmarkedPosts(["b1"])).toEqual([{ id: "b1" }]);
  });
  it("에러 시 throw", async () => {
    h.result.error = new Error("bm");
    await expect(fetchBookmarkedPosts(["b1"])).rejects.toThrow("bm");
  });
});

describe("fetchCommunityPost", () => {
  it("행 반환", async () => {
    h.result.data = { id: "p1" };
    expect(await fetchCommunityPost("p1")).toEqual({ id: "p1" });
  });
  it("없으면 null", async () => {
    h.result.data = null;
    expect(await fetchCommunityPost("p1")).toBeNull();
  });
  it("에러 시 throw", async () => {
    h.result.error = new Error("post");
    await expect(fetchCommunityPost("p1")).rejects.toThrow("post");
  });
});

describe("fetchCommunityPostForEdit", () => {
  it("행 반환", async () => {
    h.result.data = { id: "e1" };
    expect(await fetchCommunityPostForEdit("e1")).toEqual({ id: "e1" });
  });
  it("에러 시 throw", async () => {
    h.result.error = new Error("edit");
    await expect(fetchCommunityPostForEdit("e1")).rejects.toThrow("edit");
  });
});

describe("incrementPostViews", () => {
  it("RPC 호출(인자 전달)", async () => {
    await incrementPostViews("p1");
    expect(h.rpc).toHaveBeenCalledWith("increment_post_views", { p_post_id: "p1" });
  });
});

describe("createCommunityPost", () => {
  const body = {
    user_id: "u1",
    category: "자유",
    title: "t",
    content: "c",
    has_image: false,
    image_urls: [],
    wedding_style: null,
  };
  it("생성된 행 반환", async () => {
    h.result.data = { id: "new1" };
    expect(await createCommunityPost(body)).toEqual({ id: "new1" });
  });
  it("에러 시 throw", async () => {
    h.result.error = new Error("create");
    await expect(createCommunityPost(body)).rejects.toThrow("create");
  });
});

describe("updateCommunityPost", () => {
  const patch = { category: "자유", title: "t", content: "c", has_image: false, image_urls: [] };
  it("성공 시 resolve", async () => {
    await expect(updateCommunityPost("p1", "u1", patch)).resolves.toBeUndefined();
  });
  it("에러 시 throw", async () => {
    h.result.error = new Error("update");
    await expect(updateCommunityPost("p1", "u1", patch)).rejects.toThrow("update");
  });
});

describe("deleteCommunityPost", () => {
  it("성공 시 resolve", async () => {
    await expect(deleteCommunityPost("p1", "u1")).resolves.toBeUndefined();
  });
  it("에러 시 throw", async () => {
    h.result.error = new Error("del");
    await expect(deleteCommunityPost("p1", "u1")).rejects.toThrow("del");
  });
});

describe("linkCommunityPostPlaces", () => {
  it("빈 배열이면 insert 안 함", async () => {
    await linkCommunityPostPlaces("p1", []);
    expect(h.insert).not.toHaveBeenCalled();
  });
  it("place 들을 insert", async () => {
    await linkCommunityPostPlaces("p1", ["v1", "v2"]);
    expect(h.insert).toHaveBeenCalledWith([
      { post_id: "p1", place_id: "v1" },
      { post_id: "p1", place_id: "v2" },
    ]);
  });
  it("에러 시 throw", async () => {
    h.result.error = new Error("link");
    await expect(linkCommunityPostPlaces("p1", ["v1"])).rejects.toThrow("link");
  });
});

describe("fetchCommunityComments", () => {
  it("행 반환", async () => {
    h.result.data = [{ id: "c1" }];
    expect(await fetchCommunityComments("p1", [])).toEqual([{ id: "c1" }]);
  });
  it("차단 id 있어도 행 반환", async () => {
    h.result.data = [{ id: "c2" }];
    expect(await fetchCommunityComments("p1", ["u9"])).toEqual([{ id: "c2" }]);
  });
  it("에러 시 throw", async () => {
    h.result.error = new Error("comments");
    await expect(fetchCommunityComments("p1", [])).rejects.toThrow("comments");
  });
});

describe("createCommunityComment", () => {
  it("insert 호출(parent null 기본)", async () => {
    await createCommunityComment({ postId: "p1", userId: "u1", content: "hi" });
    expect(h.insert).toHaveBeenCalledWith({
      post_id: "p1",
      user_id: "u1",
      content: "hi",
      parent_comment_id: null,
    });
  });
  it("parentCommentId 전달", async () => {
    await createCommunityComment({ postId: "p1", userId: "u1", content: "re", parentCommentId: "c0" });
    expect(h.insert).toHaveBeenCalledWith({
      post_id: "p1",
      user_id: "u1",
      content: "re",
      parent_comment_id: "c0",
    });
  });
  it("에러 시 throw", async () => {
    h.result.error = new Error("addc");
    await expect(createCommunityComment({ postId: "p1", userId: "u1", content: "x" })).rejects.toThrow("addc");
  });
});

describe("deleteCommunityComment", () => {
  it("성공 시 resolve", async () => {
    await expect(deleteCommunityComment("c1", "u1")).resolves.toBeUndefined();
  });
  it("에러 시 throw", async () => {
    h.result.error = new Error("delc");
    await expect(deleteCommunityComment("c1", "u1")).rejects.toThrow("delc");
  });
});

describe("updateCommunityComment", () => {
  it("성공 시 resolve", async () => {
    await expect(updateCommunityComment("c1", "u1", "edit")).resolves.toBeUndefined();
  });
  it("에러 시 throw", async () => {
    h.result.error = new Error("updc");
    await expect(updateCommunityComment("c1", "u1", "edit")).rejects.toThrow("updc");
  });
});

describe("fetchPostLikesCount", () => {
  it("count 반환", async () => {
    h.result.count = 7;
    expect(await fetchPostLikesCount("p1")).toBe(7);
  });
  it("count null 이면 0", async () => {
    h.result.count = null;
    expect(await fetchPostLikesCount("p1")).toBe(0);
  });
  it("에러 시 throw", async () => {
    h.result.error = new Error("cnt");
    await expect(fetchPostLikesCount("p1")).rejects.toThrow("cnt");
  });
});

describe("fetchPostLiked", () => {
  it("좋아요 있으면 true", async () => {
    h.result.data = { id: "l1" };
    expect(await fetchPostLiked("p1", "u1")).toBe(true);
  });
  it("없으면 false", async () => {
    h.result.data = null;
    expect(await fetchPostLiked("p1", "u1")).toBe(false);
  });
  it("에러 시 throw", async () => {
    h.result.error = new Error("liked");
    await expect(fetchPostLiked("p1", "u1")).rejects.toThrow("liked");
  });
});

describe("addPostLike", () => {
  it("insert 호출", async () => {
    await addPostLike("p1", "u1");
    expect(h.insert).toHaveBeenCalledWith({ post_id: "p1", user_id: "u1" });
  });
  it("에러 시 throw", async () => {
    h.result.error = new Error("addl");
    await expect(addPostLike("p1", "u1")).rejects.toThrow("addl");
  });
});

describe("removePostLike", () => {
  it("성공 시 resolve", async () => {
    await expect(removePostLike("p1", "u1")).resolves.toBeUndefined();
  });
  it("에러 시 throw", async () => {
    h.result.error = new Error("reml");
    await expect(removePostLike("p1", "u1")).rejects.toThrow("reml");
  });
});

describe("uploadCommunityImages", () => {
  it("빈 배열이면 빈 결과", async () => {
    expect(await uploadCommunityImages("u1", [])).toEqual([]);
    expect(h.upload).not.toHaveBeenCalled();
  });
  it("업로드 후 publicUrl 배열 반환", async () => {
    const file = new File(["x"], "a.png", { type: "image/png" });
    const res = await uploadCommunityImages("u1", [file]);
    expect(res).toEqual(["https://pub/x"]);
    expect(h.upload).toHaveBeenCalledTimes(1);
  });
  it("업로드 실패 시 throw", async () => {
    h.upload.mockResolvedValue({ error: new Error("up") });
    const file = new File(["x"], "a.png", { type: "image/png" });
    await expect(uploadCommunityImages("u1", [file])).rejects.toThrow("이미지 업로드에 실패했습니다.");
  });
});
