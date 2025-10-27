import {
  type CellContext,
  type ColumnDef,
  type ColumnHelper,
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  type Row,
  type SortingState,
  useReactTable,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import clsx from 'clsx';
import {
  type AnchorHTMLAttributes,
  type ReactNode,
  useRef,
  useState,
} from 'react';
import {
  formatDate,
  msToDuration,
  msToMinutes,
  relativeFormat,
} from '../../lib/datetime';
import type { AlbumSimplified, TrackSimplified } from '../../lib/spotify';
import { AudioProvider } from '../AudioProvider';
import Icon from '../Icon';
import Search from '../Search';
import TrackPreview from './TrackPreview';

function ExternalLink({
  target = '_blank',
  rel = 'noopener noreferrer nofollow',
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a {...props} target={target} rel={rel} />;
}

function getColumnMeta<T>(columnDef: ColumnDef<T, unknown>) {
  return columnDef.meta as Record<string, string>;
}

const columnHelper = createColumnHelper<SpotifyTableProps['data'][number]>();
const albumOrTrackColumnHelper = columnHelper as ColumnHelper<
  AlbumSimplified | TrackSimplified
>;
const trackColumnHelper = columnHelper as ColumnHelper<TrackSimplified>;
const artistColumnHelper =
  columnHelper as ColumnHelper<SpotifyApi.ArtistObjectFull>;

const separator = '|SEP|';

type MainColumnMode = 'title' | 'artist';

const getMainColumn = (mode: MainColumnMode) =>
  albumOrTrackColumnHelper.accessor(
    (row) => {
      const artists = row.artists.map(({ name }) => name).join(' ');
      return mode === 'title'
        ? `${row.name} ${separator} ${artists}`
        : `${artists} ${separator} ${row.name}`;
    },
    {
      cell: ({ row: { original: row } }) => {
        const isAlbum = 'image_url' in row;
        return (
          <div key={row.id} className="flex items-center gap-4">
            <img
              src={isAlbum ? row.image_url : row.album.image_url}
              alt={row.name}
              className={clsx({ 'h-16 w-16': isAlbum, 'h-8 w-8': !isAlbum })}
            />
            <div className="min-w-0">
              {row.url ? (
                <ExternalLink
                  title={row.name}
                  className="text-primary block overflow-hidden text-ellipsis hover:underline"
                  href={row.url}
                >
                  {row.name}
                </ExternalLink>
              ) : (
                <span>{row.name}</span>
              )}
              <div className="text-primary overflow-hidden text-ellipsis text-sm">
                {row.artists
                  .map<ReactNode>((artist) =>
                    artist.url ? (
                      <ExternalLink
                        key={artist.id}
                        className="text-secondary hover:underline"
                        href={artist.url}
                      >
                        {artist.name}
                      </ExternalLink>
                    ) : (
                      <span key={artist.name}>{artist.name}</span>
                    ),
                  )
                  .reduce((prev, curr) => [prev, ', ', curr])}
              </div>
            </div>
          </div>
        );
      },
      id: mode,
      header: mode === 'title' ? 'Title' : 'Artist',
      meta: { class: 'text-left text-ellipsis overflow-hidden' },
    },
  );

const columns = {
  number: columnHelper.display({
    id: 'number',
    cell: ({ row: { index } }) => index + 1,
    header: () => (
      <span aria-hidden="true">
        # <span className="sr-only">(Number)</span>
      </span>
    ),
    meta: {
      label: 'Number',
      class: 'w-[6%] text-center tabular-nums',
      headerClass: 'justify-center',
    },
  }),
  trackNumber: trackColumnHelper.display({
    id: 'number',
    cell: ({
      row: { index, original: row },
    }: CellContext<TrackSimplified, unknown>) => (
      <TrackPreview
        number={index + 1}
        label={`Preview ${row.name} by ${row.artists.map(({ name }) => name).join(', ')}`}
        previewUrl={row.preview_url}
      />
    ),
    header: () => (
      <span aria-hidden="true">
        # <span className="sr-only">(Track number)</span>
      </span>
    ),
    meta: {
      label: 'Track number',
      class: 'w-[6.5%] text-center tabular-nums',
      headerClass: 'justify-center',
    },
  }),
  main: {
    title: getMainColumn('title'),
    artist: getMainColumn('artist'),
  },
  artist: artistColumnHelper.accessor(
    (row) => {
      const genres = row.genres.join(', ');
      return `${row.name} ${separator} ${genres}`;
    },
    {
      cell: ({ row: { original: row } }) => (
        <div className="flex items-center gap-4" key={row.id}>
          <img
            src={
              row.images
                .filter(
                  (image) =>
                    row.images.length === 1 ||
                    (image?.width && image.width > 100),
                )
                .at(-1)?.url
            }
            alt={row.name}
            className="h-24 w-24"
          />
          <div className="min-w-0">
            <ExternalLink
              title={row.name}
              className="text-primary block overflow-hidden text-ellipsis hover:underline"
              href={row.external_urls.spotify}
            >
              {row.name}
            </ExternalLink>
            <div className="whitespace-pre-wrap text-sm">
              {row.genres.join(', ')}
            </div>
          </div>
        </div>
      ),
      id: 'name',
      header: 'Name',
      meta: { class: 'text-left text-ellipsis overflow-hidden' },
    },
  ),
  album: trackColumnHelper.accessor((row) => row.album.name, {
    cell: ({ row: { original: row } }) =>
      row.album.url ? (
        <ExternalLink
          className="text-secondary text-sm hover:underline"
          key={row.id}
          href={row.album.url}
          title={row.album.name}
        >
          {row.album.name}
        </ExternalLink>
      ) : (
        <span key={row.id} className="text-secondary text-sm">
          {row.album.name}
        </span>
      ),
    header: 'Album',
    meta: { class: 'w-[25%] text-left text-ellipsis overflow-hidden' },
  }),
  addedAt: albumOrTrackColumnHelper.accessor('added_at', {
    cell: (info) => (
      <time
        key={info.row.id}
        className="text-secondary text-sm"
        dateTime={info.getValue()}
        title={formatDate(info.getValue())}
      >
        {relativeFormat(info.getValue())}
      </time>
    ),
    header: 'Date added',
    sortDescFirst: true,
    meta: { class: 'w-[15%] text-left' },
  }),
  duration: trackColumnHelper.accessor('duration_ms', {
    cell: (info) => (
      <time
        key={info.row.id}
        className="text-secondary text-sm"
        dateTime={msToDuration(info.getValue())}
      >
        {msToMinutes(info.getValue())}
      </time>
    ),
    header: () => (
      <span title="Duration">
        <Icon
          className="stroke-[2.5]"
          name="tabler:clock"
          aria-label="Duration"
        />
      </span>
    ),
    meta: {
      label: 'Duration',
      class: 'w-[6%] text-right tabular-nums',
      headerClass: 'justify-end',
    },
    enableGlobalFilter: false,
  }),
  popularity: columnHelper.accessor('popularity', {
    cell: (info) => (
      <span key={info.row.id} className="text-secondary text-sm">
        {info.getValue()}
      </span>
    ),
    header: () => (
      <span title="Popularity">
        <Icon className="stroke-[2.5]" name="tabler:chart-bar" />
      </span>
    ),
    meta: {
      label: 'Popularity',
      class: 'w-[7%] text-right tabular-nums',
      headerClass: 'justify-end',
    },
    enableGlobalFilter: false,
  }),
};

type TableType = 'album' | 'track' | 'artist';

const getColumns = (type: TableType, mode: MainColumnMode) =>
  ({
    album: [
      columns.number,
      columns.main[mode],
      columns.addedAt,
      columns.popularity,
    ],
    track: [
      columns.trackNumber,
      columns.main[mode],
      columns.album,
      columns.addedAt,
      columns.duration,
      columns.popularity,
    ],
    artist: [columns.number, columns.artist, columns.popularity],
  })[type] as ColumnDef<
    AlbumSimplified | TrackSimplified | SpotifyApi.ArtistObjectFull
  >[];

const defaultSortingState: SortingState = [{ id: 'added_at', desc: true }];

const virtualizerConfig = {
  album: {
    overscan: 40,
    estimateSize: () => 80,
  },
  track: {
    overscan: 32,
    estimateSize: () => 64,
  },
  artist: {
    overscan: 32,
    estimateSize: () => 64,
  },
} as const;

interface TableProps {
  className?: string;
  defaultSorting?: SortingState;
}

interface AlbumTableProps extends TableProps {
  data: AlbumSimplified[];
  type: 'album';
}

interface TrackTableProps extends TableProps {
  data: TrackSimplified[];
  type: 'track';
}

interface ArtistTableProps extends TableProps {
  data: SpotifyApi.ArtistObjectFull[];
  type: 'artist';
}

type SpotifyTableProps = AlbumTableProps | TrackTableProps | ArtistTableProps;

export default function SpotifyTable({
  className,
  data,
  defaultSorting = defaultSortingState,
  type,
}: SpotifyTableProps) {
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [mode, setMode] = useState<MainColumnMode>('title');
  const [globalFilter, setGlobalFilter] = useState('');

  const table = useReactTable<
    AlbumSimplified | TrackSimplified | SpotifyApi.ArtistObjectFull
  >({
    data,
    columns: getColumns(type, mode),
    state: {
      sorting: sorting.length ? sorting : defaultSorting,
      globalFilter,
      columnVisibility: {
        added_at:
          data[0] && 'added_at' in data[0]
            ? !!new Date(data[0]?.added_at).getTime()
            : false,
      },
    },
    onSortingChange: (v) => {
      if (
        sorting.length &&
        (sorting[0].id === 'title' || sorting[0].id === 'artist') &&
        sorting[0].desc
      ) {
        setMode('artist');
        if (sorting[0].id === 'title') {
          setSorting([{ id: 'artist', desc: false }]);
          return;
        }
      }
      setSorting(v);
    },
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: 'includesString',
    getFilteredRowModel: getFilteredRowModel(),
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const { rows } = table.getRowModel();

  const rowVirtualizer = useVirtualizer({
    getScrollElement: () => tableContainerRef.current,
    count: rows.length,
    ...virtualizerConfig[type],
  });
  const virtualRows = rowVirtualizer.getVirtualItems();
  const totalSize = rowVirtualizer.getTotalSize();
  const paddingTop = virtualRows.length > 0 ? virtualRows?.[0]?.start || 0 : 0;
  const paddingBottom =
    virtualRows.length > 0
      ? totalSize - (virtualRows[virtualRows.length - 1]?.end || 0)
      : 0;

  return (
    <AudioProvider>
      <Search
        onChange={({ target: { value } }) => setGlobalFilter(String(value))}
        value={globalFilter}
        className="w-full"
        placeholder="Search…"
      />
      <div
        ref={tableContainerRef}
        className={clsx(
          'h-[max(calc(100vh-14rem),16rem)] overflow-auto',
          className,
        )}
      >
        {
          // Assume that the table is never empty if the data is loaded, unless
          // a search query is specified.
          !virtualRows.length ? (
            <div className="flex h-full flex-col items-center justify-center gap-4">
              {globalFilter ? (
                <>
                  <Icon
                    className="w-32 h-32 stroke-[1.5]"
                    name="tabler:music"
                  />
                  No results available for the given search query.
                </>
              ) : (
                <>
                  <img
                    aria-hidden="true"
                    className="mx-auto my-2"
                    alt="Loading…"
                    src="/img/equaliser-animated-green.gif"
                  />
                  Loading…
                </>
              )}
            </div>
          ) : (
            <table className="w-[55rem] table-fixed border-separate border-spacing-0 whitespace-nowrap">
              <thead className="bg-primary sticky top-0">
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => {
                      const meta = getColumnMeta(header.column.columnDef);
                      const label =
                        meta.label || header.column.columnDef.header;
                      const sortable = header.column.getCanSort();
                      const sortDirection = header.column.getIsSorted();
                      const sortInfo = {
                        asc: {
                          component: (
                            <Icon
                              className="shrink-0 stroke-[2.5]"
                              name="tabler:arrow-up"
                            />
                          ),
                          otherLabel: 'descending',
                        },
                        desc: {
                          component: (
                            <Icon
                              className="shrink-0 stroke-[2.5]"
                              name="tabler:arrow-down"
                            />
                          ),
                          otherLabel: 'ascending',
                        },
                      }[sortDirection as string];

                      const buttonDirectionLabel =
                        sortInfo?.otherLabel || 'descending';
                      const buttonLabel = sortable
                        ? `Sort ${buttonDirectionLabel} by ${label}`
                        : undefined;

                      return (
                        <th
                          className={clsx(
                            meta.class,
                            'border-b border-slate-400/50 p-2 font-semibold',
                          )}
                          key={header.id}
                        >
                          {header.isPlaceholder ? null : (
                            <button
                              className={clsx(
                                'flex w-full items-center gap-1',
                                meta.headerClass,
                                { 'cursor-pointer select-none': sortable },
                              )}
                              disabled={!sortable}
                              aria-label={buttonLabel}
                              type="button"
                              onClick={header.column.getToggleSortingHandler()}
                            >
                              {flexRender(
                                header.column.columnDef.header,
                                header.getContext(),
                              )}
                              {sortInfo?.component ?? null}
                            </button>
                          )}
                        </th>
                      );
                    })}
                  </tr>
                ))}
              </thead>
              <tbody>
                {paddingTop > 0 ? (
                  <tr>
                    <td style={{ height: `${paddingTop}px` }} />
                  </tr>
                ) : null}
                {virtualRows.map((virtualRow) => {
                  const row = rows[virtualRow.index] as Row<
                    (typeof data)[number]
                  >;
                  return (
                    <tr
                      key={row.id}
                      className="group/row focus-within:bg-blue-300/10 hover:bg-blue-300/10"
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td
                          className={clsx(
                            getColumnMeta(cell.column.columnDef)?.class,
                            'p-2 first-of-type:rounded-l-sm last-of-type:rounded-r-sm',
                          )}
                          key={`${cell.column.id}-${cell.id}`}
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )}
                        </td>
                      ))}
                    </tr>
                  );
                })}
                {paddingBottom > 0 ? (
                  <tr>
                    <td style={{ height: `${paddingBottom}px` }} />
                  </tr>
                ) : null}
              </tbody>
              <tfoot>
                {table.getFooterGroups().map((footerGroup) => (
                  <tr key={footerGroup.id}>
                    {footerGroup.headers.map((header) => (
                      <th key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.footer,
                              header.getContext(),
                            )}
                      </th>
                    ))}
                  </tr>
                ))}
              </tfoot>
            </table>
          )
        }
      </div>
    </AudioProvider>
  );
}
