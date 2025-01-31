/* eslint-disable @typescript-eslint/no-explicit-any */
import { useInfiniteQuery } from "@tanstack/react-query";
import React, {
  Dispatch,
  SetStateAction,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from "react";
import tenorApi from "../api/tenorApi";
import Constants from "../constants/Constants";
import Masonry from "react-masonry-css";
import { IoIosStar } from "react-icons/io";
import ModalContext from "../contexts/ModalContext";
import ModalUtils from "../util/ModalUtil";

export default function TenorList({
  query,
  showFavorites = false,

  gifFavorites,
  setGifFavorites,
  onGifSelected = () => {},
}: {
  query: string;
  showFavorites?: boolean;

  gifFavorites?: Set<string>;
  setGifFavorites?: Dispatch<SetStateAction<Set<string>>>;
  onGifSelected?: (url: string) => void;
}) {
  const modalContext = useContext(ModalContext);
  const gifs = useInfiniteQuery({
    queryKey: ["tenor_gif", query],
    initialPageParam: undefined,
    queryFn: async ({ pageParam }) => {
      try {
        if (showFavorites) {
          return undefined;
        }
        const response = await tenorApi.get("search", {
          params: {
            key: Constants.TENOR_API_KEY,
            q: query,
            pos: pageParam,
            contentFilter: "medium",
            media_filter: "gif,tinygif",
            limit: 30,
          },
        });

        return response.data;
      } catch (err) {
        console.error(err);
        return undefined;
      }
    },
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage) return undefined;
      if (allPages.length >= 10) {
        return undefined;
      }
      return lastPage.next.length ? lastPage.next : undefined;
    },
  });

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = () => {
      if (containerRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
        if (
          scrollTop + clientHeight >= scrollHeight - 50 &&
          gifs.hasNextPage &&
          !gifs.isFetchingNextPage
        ) {
          gifs.fetchNextPage();
        }
      }
    };

    containerRef.current?.addEventListener("scroll", handler);

    return () => containerRef.current?.removeEventListener("scroll", handler);
  }, [gifs.hasNextPage, gifs.isFetchingNextPage]);

  const handleAddOrRemoveFavorite = useCallback((url: string) => {
    if (!setGifFavorites) return;
    const data = localStorage.getItem("gifFavorites");
    const gifFavoritesArray: string[] = data ? JSON.parse(data) : [];
    const gifFavorites = new Set(gifFavoritesArray);

    if (!gifFavorites.has(url)) {
      //add new favorite
      if (gifFavorites.size >= 50) {
        ModalUtils.openGenericModal(
          modalContext,
          "Oof.",
          "You cannot add more than 50 favorites - remove some!"
        );
        return;
      }
      gifFavorites.add(url);
      localStorage.setItem("gifFavorites", JSON.stringify([...gifFavorites]));

      setGifFavorites(gifFavorites);
    } else {
      //remove favorite
      gifFavorites.delete(url);
      localStorage.setItem("gifFavorites", JSON.stringify([...gifFavorites]));
      setGifFavorites(gifFavorites);
    }
  }, []);

  const gifFavoritesArray = useMemo(() => {
    return [...(gifFavorites ?? [])];
  }, [gifFavorites]);
  return (
    <div ref={containerRef} className="overflow-y-scroll h-[50vh]">
      <Masonry
        breakpointCols={{
          default: 3,
          768: 2,
        }}
        className="flex"
        columnClassName=""
      >
        {showFavorites &&
          gifFavorites &&
          gifFavoritesArray.map((gifUrl) => (
            <div key={gifUrl} className="relative cursor-pointer m-2">
              <img src={gifUrl} className="w-full rounded-md animate-fadeIn" />
              <div
                onClick={() => {
                  onGifSelected(gifUrl);
                }}
                className="absolute transition hover:bg-opacity-50 group/gifOverlay top-0 left-0 rounded-md w-full h-full bg-lime-500 bg-opacity-0"
              >
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAddOrRemoveFavorite(gifUrl);
                  }}
                  className="absolute hidden bg-black bg-opacity-50 group-hover/gifOverlay:block top-0 right-0 m-2 p-2 rounded-md text-yellow-500 text-lg md:text-2xl group/favorite"
                >
                  <div
                    className={`${
                      gifFavorites.has(gifUrl)
                        ? "text-yellow-500"
                        : "text-gray-500"
                    } transition`}
                  >
                    <IoIosStar />
                  </div>
                </div>
              </div>
            </div>
          ))}

        {!showFavorites &&
          gifs.data &&
          gifs.data.pages["map"] &&
          gifs.data.pages.flatMap((page) => {
            if (page.results) {
              return page.results.map((gif: any, i: number) => {
                return (
                  <div key={gif.id + i} className="relative cursor-pointer m-2">
                    <img
                      src={gif.media_formats.tinygif.url}
                      className="w-full rounded-md animate-fadeIn"
                    />
                    <div
                      onClick={() => {
                        onGifSelected(gif.media_formats.gif.url);
                      }}
                      className="absolute transition hover:bg-opacity-50 group/gifOverlay top-0 left-0 rounded-md w-full h-full bg-lime-500 bg-opacity-0"
                    >
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddOrRemoveFavorite(gif.media_formats.gif.url);
                        }}
                        className="absolute hidden bg-black bg-opacity-50 group-hover/gifOverlay:block top-0 right-0 m-2 p-2 rounded-md text-yellow-500 text-lg md:text-2xl group/favorite"
                      >
                        <div
                          className={`${
                            gifFavorites &&
                            gifFavorites.has(gif.media_formats.gif.url)
                              ? "text-yellow-500"
                              : "text-gray-500"
                          } transition`}
                        >
                          <IoIosStar />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              });
            } else {
              return <></>;
            }
          })}
      </Masonry>
    </div>
  );
}
