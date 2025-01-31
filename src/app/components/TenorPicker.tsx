/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useCallback, useEffect, useState } from "react";
import PrimaryInput from "./PrimaryInput";
import { FaArrowLeft, FaSearch } from "react-icons/fa";
import { useQuery } from "@tanstack/react-query";

import Constants from "../constants/Constants";

import tenorApi from "../api/tenorApi";
import { useDebounceValue } from "usehooks-ts";
import TenorList from "./TenorList";
import { IoIosStar } from "react-icons/io";

export default function TenorPicker({
  onGifSelected = () => {},
}: {
  onGifSelected?: (url: string) => void;
}) {
  const [boundQuery, setBoundQuery] = useState("");
  const [query, setQuery] = useDebounceValue("", 500);
  const [autoSuggestions, setAutoSuggestions] = useState<string[]>([]);
  const [showFavorites, setShowFavorites] = useState(false);
  const [gifFavorites, setGifFavorites] = useState<Set<string>>(new Set());
  useEffect(() => {
    //load gif favorites data
    const data = localStorage.getItem("gifFavorites");
    const gifFavoritesArray: string[] = data ? JSON.parse(data) : [];
    const gifFavorites = new Set(gifFavoritesArray);

    setGifFavorites(gifFavorites);
  }, []);

  const categories = useQuery({
    queryKey: ["tenor_category"],
    queryFn: async () => {
      try {
        const response = await tenorApi.get("categories", {
          params: {
            key: Constants.TENOR_API_KEY,
          },
        });

        return response.data;
      } catch (err) {
        console.error(err);
        return undefined;
      }
    },

    refetchOnMount: true,
  });

  const handleGetAutoCompletion = useCallback(async (query: string) => {
    try {
      const response = await tenorApi.get("autocomplete", {
        params: {
          key: Constants.TENOR_API_KEY,
          q: query,
        },
      });

      return response.data;
    } catch (err) {
      console.error(err);
      return undefined;
    }
  }, []);

  useEffect(() => {
    const handler = async () => {
      if (query.length >= 2) {
        //handle auto completion
        const res = await handleGetAutoCompletion(query);
        if (res && res.results && res.results.length) {
          setAutoSuggestions(res.results as string[]);
        } else {
          setAutoSuggestions([]);
        }
      } else {
        setAutoSuggestions([]);
      }
    };

    handler();

    if (query.length >= 2) setShowFavorites(false);
  }, [query]);

  return (
    <div className="flex flex-col gap-2 p-4 w-full overflow-y-scroll h-fit relative">
      <div className="flex justify-center items-center text-lime-300 gap-2">
        {(query.length >= 2 || showFavorites) && (
          <div
            className="cursor-pointer top-0 left-0 rounded-md text-lime-300 transition hover:text-lime-100"
            onClick={(e) => {
              e.stopPropagation();
              setShowFavorites(false);
              setBoundQuery("");
              setQuery("");
            }}
          >
            <FaArrowLeft />
          </div>
        )}

        <FaSearch />

        <PrimaryInput
          id="tenorSearchInput"
          type="text"
          placeholder="Search Tenor.."
          customStylesInput="w-full"
          value_={boundQuery}
          onChange={(e) => {
            setQuery(e.target.value);
            setBoundQuery(e.target.value);
          }}
        />
      </div>

      <div
        className={`${
          autoSuggestions.length ? "max-h-[3rem]" : "max-h-0"
        } h-[3rem] flex justify-start items-center overflow-x-scroll transition-all duration-500 w-full gap-2 no-scrollbar`}
      >
        {autoSuggestions.map((item) => (
          <div
            key={item}
            className="rounded-md p-2 cursor-pointer transition hover:bg-lime-500 text-white whitespace-nowrap bg-lime-600 text-xs"
            onClick={(e) => {
              e.stopPropagation();
              setBoundQuery(item);
              setQuery(item);
            }}
          >
            {item}
          </div>
        ))}
      </div>

      {query.length <= 1 && !showFavorites && (
        <div className="animate-fadeIn grid grid-cols-2 md:grid-cols-3 gap-2 overflow-y-scroll h-[50vh]">
          <div
            className="grid place-content-center rounded-md w-full h-[7rem] p-2 text-lime-300 font-bold
            bg-cover bg-center bg-no-repeat bg-lime-700 bg-blend-overlay bg-opacity-70 transition cursor-pointer hover:bg-opacity-10"
            style={{
              backgroundImage: gifFavorites.size
                ? `url(${gifFavorites.values().next().value})`
                : "",
            }}
            onClick={(e) => {
              e.stopPropagation();
              setShowFavorites(true);
            }}
          >
            <div className="flex justify-center items-center gap-2">
              <div className="text-yellow-500">
                <IoIosStar />
              </div>
              Favorites
            </div>
          </div>
          {categories.data &&
            categories.data["tags"] &&
            categories.data["tags"].map((e: any) => {
              return (
                <div
                  key={e.searchterm}
                  className="grid place-content-center rounded-md w-full h-[7rem] p-2 text-lime-400 font-bold
            bg-cover bg-center bg-no-repeat bg-lime-500 bg-blend-overlay bg-opacity-70 transition cursor-pointer hover:bg-opacity-10"
                  style={{
                    backgroundImage: `url(${e.image})`,
                  }}
                  onClick={() => {
                    setQuery(e.searchterm);
                    setBoundQuery(e.searchterm);
                  }}
                >
                  {e.searchterm}
                </div>
              );
            })}
        </div>
      )}

      {((showFavorites && query.length === 0) || query.length >= 2) && (
        <TenorList
          query={query}
          showFavorites={showFavorites}
          gifFavorites={gifFavorites}
          setGifFavorites={setGifFavorites}
          onGifSelected={onGifSelected}
        />
      )}
    </div>
  );
}
